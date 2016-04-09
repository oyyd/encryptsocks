import { readFileSync } from 'fs';
import { join } from 'path';
import { createServer as _createServer, connect } from 'net';
import { inetNtoa } from './utils';

function handleMethod(connection, data) {
  // +----+----------+----------+
  // |VER | NMETHODS | METHODS  |
  // +----+----------+----------+
  // | 1  |    1     | 1 to 255 |
  // +----+----------+----------+
  const buf = new Buffer(2);

  // TODO:
  // if (data[0] !== 0x05) {
  //   console.log('unsupported socks version');
  //   return -1;
  // }

  if (!~data.indexOf(0x00, 2)) {
    console.log('unsupported method');
    buf.writeUInt16BE(0x05FF);
    connection.write(buf);
    return -1;
  }

  buf.writeUInt16BE(0x0500);
  connection.write(buf);

  return 1;
}

export function getDstInfo(data) {
  const atyp = data[3];

  let dstAddr;
  let dstPort;
  let dstAddrLength;
  let dstPortIndex;

  switch (atyp) {
    case 0x01:
      dstAddrLength = 4;
      dstAddr = data.slice(4, 8);
      dstPort = data.slice(8, 10);
      break;
    case 0x04:
      dstAddrLength = 16;
      dstAddr = data.slice(4, 20);
      dstPort = data.slice(20, 22);
      break;
    case 0x03:
      dstAddrLength = data[4];
      dstPortIndex = 5 + dstAddrLength;
      dstAddr = data.slice(5, dstPortIndex);
      dstPort = data.slice(dstPortIndex, dstPortIndex + 2);
      break;
    default:
      return null;
  }

  return {
    atyp, dstAddrLength, dstAddr, dstPort,
  };
}

function handleRequest(connection, data) {
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  const cmd = data[1];
  const dstInfo = getDstInfo(data);
  const repBuf = new Buffer(4);

  if (cmd !== 0x01) {
    console.log('unsupported cmd');
    return {
      stage: -1,
    };
  }

  if (!dstInfo) {
    return {
      stage: -1,
    };
  }

  // +----+-----+-------+------+----------+----------+
  // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+

  // TODO: should fill BND fields with 0?
  repBuf.writeUInt16BE(0x0500);
  repBuf.writeUInt16BE(dstInfo.atyp, 2);

  connection.write(repBuf);

  return {
    stage: 2,
    dstAddr: dstInfo.dstAddr,
    dstPort: dstInfo.dstPort,
    atyp: dstInfo.atyp,
  };
}

function tunnel(connection, remoteClient, data, atyp, dstAddr, dstPort) {
  let options;

  if (!remoteClient) {
    options = {
      port: dstPort.readUInt16BE(),
      host: (atyp === 3 ? dstAddr.toString('ascii') : inetNtoa(dstAddr)),
    };

    // console.log(options);

    remoteClient = connect(options);

    remoteClient.on('data', remoteData => {
      connection.write(remoteData);
    });

    remoteClient.on('close', () => {
      connection.destroy();
    });
  }

  remoteClient.write(data);

  return 3;
}

function handleConnection(connection) {
  let stage = 0;
  let remoteClient;
  let tmp;
  let dstAddr;
  let dstPort;
  let atyp;

  connection.on('data', data => {
    switch (stage) {
      case 0:
        stage = handleMethod(connection, data);
        break;
      case 1:
        tmp = handleRequest(connection, data);
        dstAddr = tmp.dstAddr;
        dstPort = tmp.dstPort;
        atyp = tmp.atyp;
        stage = tmp.stage;
        break;
      case 2:
        remoteClient = tunnel(connection, remoteClient, data, atyp, dstAddr, dstPort);
        break;
      default:
        return;
    }

    if (stage === -1) {
      connection.destroy();
    }
  });
}

function createServer() {
  const server = _createServer(handleConnection);

  server.on('close', () => {
    // TODO:
  });

  server.on('error', () => {
    // TODO:
  });

  return server;
}

export function startServer() {
  const config = JSON.parse(readFileSync(join(__dirname, '../config.json')));

  // TODO: throw when the port is occupied
  const server = createServer().listen(config.local_port);

  return server;
}
