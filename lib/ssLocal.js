'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDstInfo = getDstInfo;
exports.startServer = startServer;

var _fs = require('fs');

var _path = require('path');

var _net = require('net');

var _utils = require('./utils');

function handleMethod(connection, data) {
  // +----+----------+----------+
  // |VER | NMETHODS | METHODS  |
  // +----+----------+----------+
  // | 1  |    1     | 1 to 255 |
  // +----+----------+----------+
  var buf = new Buffer(2);

  // TODO:
  // if (data[0] !== 0x05) {
  //   console.log('unsupported socks version');
  //   return -1;
  // }

  if (! ~data.indexOf(0x00, 2)) {
    console.log('unsupported method');
    buf.writeUInt16BE(0x05FF);
    connection.write(buf);
    return -1;
  }

  buf.writeUInt16BE(0x0500);
  connection.write(buf);

  return 1;
}

function getDstInfo(data) {
  var atyp = data[3];

  var dstAddr = void 0;
  var dstPort = void 0;
  var dstAddrLength = void 0;
  var dstPortIndex = void 0;

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
    atyp: atyp, dstAddrLength: dstAddrLength, dstAddr: dstAddr, dstPort: dstPort
  };
}

function handleRequest(connection, data) {
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  var cmd = data[1];
  var dstInfo = getDstInfo(data);
  var repBuf = new Buffer(4);

  if (cmd !== 0x01) {
    console.log('unsupported cmd');
    return {
      stage: -1
    };
  }

  if (!dstInfo) {
    return {
      stage: -1
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
    atyp: dstInfo.atyp
  };
}

function tunnel(connection, remoteClient, data, atyp, dstAddr, dstPort) {
  var options = void 0;

  if (!remoteClient) {
    options = {
      port: dstPort.readUInt16BE(),
      host: atyp === 3 ? dstAddr.toString('ascii') : (0, _utils.inetNtoa)(dstAddr)
    };

    // console.log(options);

    remoteClient = (0, _net.connect)(options);

    remoteClient.on('data', function (remoteData) {
      connection.write(remoteData);
    });

    remoteClient.on('close', function () {
      connection.destroy();
    });
  }

  remoteClient.write(data);

  return 3;
}

function handleConnection(connection) {
  var stage = 0;
  var remoteClient = void 0;
  var tmp = void 0;
  var dstAddr = void 0;
  var dstPort = void 0;
  var atyp = void 0;

  connection.on('data', function (data) {
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
  var server = (0, _net.createServer)(handleConnection);

  server.on('close', function () {
    // TODO:
  });

  server.on('error', function () {
    // TODO:
  });

  return server;
}

function startServer() {
  var config = JSON.parse((0, _fs.readFileSync)((0, _path.join)(__dirname, '../config.json')));

  // TODO: port occupied
  var server = createServer().listen(config.local_port);

  return server;
}