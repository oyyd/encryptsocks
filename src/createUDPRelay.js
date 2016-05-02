import dgram from 'dgram';
import logger from './logger';
import { getDstInfoFromUDPMsg, inetNtoa, sendDgram } from './utils';
import LRU from 'lru-cache';

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

const NAME = 'UDP relay';
const LRU_OPTIONS = {
  max: 100,
  maxAge: 10 * 1000,
  dispose: (key, socket) => {
    // close socket if it's not closed
    if (socket) {
      socket.close();
    }
  },
};

// TODO: do we actually need multiple client sockets?
// TODO: remove invalid clients

function getIndex({ address, port }, { dstAddr, dstPort }) {
  return `${address}:${port}_${dstAddr}:${dstPort}`;
}

function createClient({ atyp, dstAddr, dstPort }, onMsg, onClose) {
  // TODO: what about domain type
  const udpType = (atyp === 1 ? 'udp4' : 'udp6');
  const socket = dgram.createSocket(udpType);

  socket.on('message', onMsg);

  socket.on('error', e => {
    logger.warn(`${NAME} client socket gets error: ${e.message}`);
  });

  socket.on('close', onClose);

  return socket;
}

export default function createUDPRelay(config, isServer) {
  const { localPort, serverAddr, serverPort } = config;
  // TODO: support udp6
  const socket = dgram.createSocket('udp4');
  const cache = new LRU(LRU_OPTIONS);
  const listenPort = (isServer ? serverPort : localPort);

  socket.on('message', (msg, rinfo) => {
    logger.debug(`${NAME} receive message: ${msg}`);
    const dstInfo = getDstInfoFromUDPMsg(msg, isServer);
    const index = getIndex(rinfo, dstInfo);
    const dstAddrStr = inetNtoa(dstInfo.dstAddr);
    const dstPortNum = dstInfo.dstPort.readUInt16BE();

    let client = cache.get(index);

    if (!client) {
      client = createClient(dstInfo, incomeMsg => {
        // TODO: decipher
        sendDgram(socket, incomeMsg, rinfo.port, rinfo.address);
      }, () => {
        cache.del(index);
      });
      cache.set(index, client);
    }

    // TODO: after connected
    // TODO: cipher
    if (isServer) {
      sendDgram(
        client, msg.slice(dstInfo.totalLength),
        dstPortNum, dstAddrStr
      );
    } else {
      sendDgram(
        client,
        // skip RSV and FLAG
        msg.slice(3),
        serverPort, serverAddr
      );
    }
  });

  socket.on('error', (err) => {
    logger.debug(`${NAME} socket err: ${err.message}`);
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
