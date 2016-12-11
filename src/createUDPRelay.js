import dgram from 'dgram';
import LRU from 'lru-cache';
import ip from 'ip';
import { getDstInfoFromUDPMsg, sendDgram, closeSilently } from './utils';
import * as encryptor from './encryptor';

// SOCKS5 UDP Request
// +----+------+------+----------+----------+----------+
// |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +----+------+------+----------+----------+----------+
// | 2  |  1   |  1   | Variable |    2     | Variable |
// +----+------+------+----------+----------+----------+
//
// SOCKS5 UDP Response
// +----+------+------+----------+----------+----------+
// |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +----+------+------+----------+----------+----------+
// | 2  |  1   |  1   | Variable |    2     | Variable |
// +----+------+------+----------+----------+----------+
//
// shadowsocks UDP Request (before encrypted)
// +------+----------+----------+----------+
// | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +------+----------+----------+----------+
// |  1   | Variable |    2     | Variable |
// +------+----------+----------+----------+
//
// shadowsocks UDP Response (before encrypted)
// +------+----------+----------+----------+
// | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +------+----------+----------+----------+
// |  1   | Variable |    2     | Variable |
// +------+----------+----------+----------+
//
// shadowsocks UDP Request and Response (after encrypted)
// +-------+--------------+
// |   IV  |    PAYLOAD   |
// +-------+--------------+
// | Fixed |   Variable   |
// +-------+--------------+

const NAME = 'udp_relay';
const LRU_OPTIONS = {
  max: 1000,
  maxAge: 10 * 1000,
  dispose: (key, socket) => {
    // close socket if it's not closed
    if (socket) {
      socket.close();
    }
  },
};
const SOCKET_TYPE = ['udp4', 'udp6'];

function getIndex({ address, port }, { dstAddrStr, dstPortNum }) {
  return `${address}:${port}_${dstAddrStr}:${dstPortNum}`;
}

function createClient(logger, { atyp, dstAddr, dstPort }, onMsg, onClose) {
  const udpType = (atyp === 1 ? 'udp4' : 'udp6');
  const socket = dgram.createSocket(udpType);

  socket.on('message', onMsg);

  socket.on('error', (e) => {
    logger.warn(`${NAME} client socket gets error: ${e.message}`);
  });

  socket.on('close', onClose);

  return socket;
}

function createUDPRelaySocket(udpType, config, isServer, logger) {
  const {
    localPort, serverPort,
    password, method,
  } = config;
  const serverAddr = udpType === 'udp4' ? config.serverAddr : config.serverAddrIPv6;

  const encrypt = encryptor.encrypt.bind(null, password, method);
  const decrypt = encryptor.decrypt.bind(null, password, method);
  const socket = dgram.createSocket(udpType);
  const cache = new LRU(Object.assign({}, LRU_OPTIONS, {
    maxAge: config.timeout * 1000,
  }));
  const listenPort = (isServer ? serverPort : localPort);

  socket.on('message', (_msg, rinfo) => {
    const msg = isServer ? decrypt(_msg) : _msg;
    const frag = msg[2];

    if (frag !== 0) {
      // drop those datagram that using frag
      return;
    }

    const dstInfo = getDstInfoFromUDPMsg(msg, isServer);
    const dstAddrStr = ip.toString(dstInfo.dstAddr);
    const dstPortNum = dstInfo.dstPort.readUInt16BE();
    const index = getIndex(rinfo, { dstAddrStr, dstPortNum });

    logger.debug(`${NAME} receive message: ${msg.toString('hex')}`);

    let client = cache.get(index);

    if (!client) {
      client = createClient(logger, dstInfo, (msgStream) => {
        // socket on message
        const incomeMsg = (isServer ? encrypt(msgStream) : decrypt(msgStream));
        sendDgram(socket, incomeMsg, rinfo.port, rinfo.address);
      }, () => {
        // socket on close
        cache.del(index);
      });
      cache.set(index, client);
    }

    if (isServer) {
      sendDgram(
        client, msg.slice(dstInfo.totalLength),
        dstPortNum, dstAddrStr
      );
    } else {
      sendDgram(
        client,
        // skip RSV and FLAG
        encrypt(msg.slice(3)),
        serverPort, serverAddr
      );
    }
  });

  socket.on('error', (err) => {
    logger.error(`${NAME} socket err: ${err.message}`);
    socket.close();
  });

  socket.on('close', () => {
    cache.reset();
  });

  socket.bind(listenPort, () => {
    logger.verbose(`${NAME} is listening on: ${listenPort}`);
  });

  return socket;
}

function close(sockets) {
  sockets.forEach((socket) => {
    closeSilently(socket);
  });
}

export default function createUDPRelay(config, isServer, logger) {
  const sockets = SOCKET_TYPE.map(udpType =>
    createUDPRelaySocket(udpType, config, isServer, logger));

  return {
    sockets,
    close: close.bind(null, sockets),
  };
}
