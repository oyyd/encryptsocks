'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startServer = startServer;

var _net = require('net');

var _utils = require('./utils');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _encryptor = require('./encryptor');

var _createUDPRelay = require('./createUDPRelay');

var _createUDPRelay2 = _interopRequireDefault(_createUDPRelay);

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import { filter } from './filter';

var NAME = 'ssLocal';

function handleMethod(connection, data) {
  // +----+----------+----------+
  // |VER | NMETHODS | METHODS  |
  // +----+----------+----------+
  // | 1  |    1     | 1 to 255 |
  // +----+----------+----------+
  var buf = new Buffer(2);

  // allow `no authetication` or any usename/password
  if (! ~data.indexOf(0x00, 2) && ! ~data.indexOf(0x02, 2)) {
    _logger2.default.warn('unsupported method: ' + data.toString('hex'));
    buf.writeUInt16BE(0x05FF);
    connection.write(buf);
    connection.end();
    return -1;
  }

  buf.writeUInt16BE(0x0500);
  _logger2.default.debug('1. TRY TO WRITE: ' + buf);
  connection.write(buf);

  return 1;
}

function handleRequest(connection, data, _ref, dstInfo, onConnect, onError, isClientConnected) {
  var serverAddr = _ref.serverAddr;
  var serverPort = _ref.serverPort;
  var password = _ref.password;
  var method = _ref.method;
  var localAddr = _ref.localAddr;
  var localPort = _ref.localPort;
  var localAddrIPv6 = _ref.localAddrIPv6;

  var cmd = data[1];
  var clientOptions = {
    port: serverPort,
    host: serverAddr
  };
  var isUDPRelay = cmd === 0x03;

  var repBuf = void 0;
  var tmp = null;
  var decipher = null;
  var decipheredData = null;
  var cipher = null;
  var cipheredData = null;

  if (cmd !== 0x01 && !isUDPRelay) {
    _logger2.default.warn('unsupported cmd: ' + cmd);
    return {
      stage: -1
    };
  }

  // prepare data

  // +----+-----+-------+------+----------+----------+
  // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+

  if (isUDPRelay) {
    var isUDP4 = dstInfo.atyp === 1;

    repBuf = new Buffer(4);
    repBuf.writeUInt32BE(isUDP4 ? 0x05000001 : 0x05000004);
    tmp = new Buffer(2);
    tmp.writeUInt16BE(localPort);
    repBuf = Buffer.concat([repBuf, _ip2.default.toBuffer(isUDP4 ? localAddr : localAddrIPv6), tmp]);

    _logger2.default.debug('Response to udp association: ' + repBuf.toString('hex'));
    connection.write(repBuf);

    return {
      stage: -1
    };
  }

  _logger2.default.verbose('connecting: ' + dstInfo.dstAddr.toString('utf8') + (':' + dstInfo.dstPort.readUInt16BE()));

  repBuf = new Buffer(10);
  repBuf.writeUInt32BE(0x05000001);
  repBuf.writeUInt32BE(0x00000000, 4, 4);
  repBuf.writeUInt16BE(0, 8, 2);

  tmp = (0, _encryptor.createCipher)(password, method, data.slice(3)); // skip VER, CMD, RSV
  cipher = tmp.cipher;
  cipheredData = tmp.data;

  // connect
  var clientToRemote = (0, _net.connect)(clientOptions, function () {
    onConnect();
  });

  clientToRemote.on('data', function (remoteData) {
    if (!decipher) {
      tmp = (0, _encryptor.createDecipher)(password, method, remoteData);
      if (!tmp) {
        _logger2.default.warn(NAME + ' ssLocal get invalid msg');
      }
      decipher = tmp.decipher;
      decipheredData = tmp.data;
    } else {
      decipheredData = decipher.update(remoteData);
    }

    _logger2.default.debug(NAME + ' received data from remote: ' + decipheredData.toString('hex'));

    if (isClientConnected()) {
      (0, _utils.writeOrPause)(clientToRemote, connection, decipheredData);
    } else {
      clientToRemote.destroy();
    }
  });

  clientToRemote.on('drain', function () {
    connection.resume();
  });

  clientToRemote.on('end', function () {
    connection.end();
  });

  clientToRemote.on('error', function (e) {
    _logger2.default.warn('ssLocal error happened in clientToRemote when' + (' connecting to ' + (0, _utils.getDstStr)(dstInfo) + ': ' + e.message));
  });

  clientToRemote.on('close', function (e) {
    if (e) {
      connection.destroy();
    } else {
      connection.end();
    }
  });

  // write
  _logger2.default.debug('2. TRY TO WRITE: ' + repBuf.toString('hex'));
  connection.write(repBuf);

  (0, _utils.writeOrPause)(connection, clientToRemote, cipheredData);

  return {
    stage: 2,
    cipher: cipher,
    clientToRemote: clientToRemote
  };
}

function handleConnection(config, connection) {
  var stage = 0;
  var clientToRemote = void 0;
  var tmp = void 0;
  var cipher = void 0;
  var dstInfo = void 0;
  var remoteConnected = false;
  var clientConnected = true;

  connection.on('data', function (data) {
    switch (stage) {
      case 0:
        _logger2.default.debug('ssLocal at stage ' + stage + ' received ' + ('data from client: ' + data.toString('hex')));

        stage = handleMethod(connection, data);

        break;
      case 1:
        dstInfo = (0, _utils.getDstInfo)(data);

        if (!dstInfo) {
          _logger2.default.warn('Failed to get \'dstInfo\' from parsing data: ' + data);
          connection.destroy();
          return;
        }

        // if (!filter(dstInfo)) {
        //   // TODO: clean everything
        //   connection.end();
        //   connection.destroy();
        //   stage = -1;
        //   return;
        // }

        _logger2.default.debug('ssLocal at stage ' + stage + ' received data ' + ('from client: ' + data.toString('hex')));

        tmp = handleRequest(connection, data, config, dstInfo, function () {
          // after connected
          remoteConnected = true;
        }, function () {
          // get invalid msg
          if (remoteConnected) {
            remoteConnected = false;
            clientToRemote.destroy();
          }

          if (clientConnected) {
            clientConnected = false;
            connection.destroy();
          }
        }, function () {
          return clientConnected;
        });

        stage = tmp.stage;

        if (stage === 2) {
          clientToRemote = tmp.clientToRemote;
          cipher = tmp.cipher;
        } else {
          // udp relay
          clientConnected = false;
          connection.end();
        }

        break;
      case 2:
        tmp = cipher.update(data);
        _logger2.default.debug('ssLocal at stage ' + stage + ' received data ' + ('from client and write to remote: ' + tmp.toString('hex')));

        (0, _utils.writeOrPause)(connection, clientToRemote, tmp);

        break;
      default:
        return;
    }
  });

  connection.on('drain', function () {
    if (remoteConnected) {
      clientToRemote.resume();
    }
  });

  connection.on('end', function () {
    clientConnected = false;
    if (remoteConnected) {
      clientToRemote.end();
    }
  });

  connection.on('close', function (e) {
    clientConnected = false;
    if (remoteConnected) {
      if (e) {
        clientToRemote.destroy();
      } else {
        clientToRemote.end();
      }
    }
  });

  connection.on('error', function (e) {
    _logger2.default.warn(NAME + ' error happened in client connection: ' + e.message);
  });

  setTimeout(function () {
    _logger2.default.warn(NAME + ' connection timeout.');
    if (clientConnected) {
      connection.destroy();
    }

    if (remoteConnected) {
      clientToRemote.destroy();
    }
  }, config.timeout * 1000);
}

function createServer(config) {
  var server = (0, _net.createServer)(handleConnection.bind(null, config));
  var udpRelay = (0, _createUDPRelay2.default)(config, false);

  server.on('close', function () {
    _logger2.default.warn(NAME + ' server closed');
  });

  server.on('error', function (e) {
    _logger2.default.error(NAME + ' server error: ' + e.message);
  });

  server.listen(config.localPort);
  _logger2.default.verbose(NAME + ' is listening on ' + config.localAddr + ':' + config.localPort);

  return {
    server: server, udpRelay: udpRelay
  };
}

function startServer(config) {
  var server = createServer(config);

  return server;
}