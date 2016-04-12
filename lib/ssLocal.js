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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
    _logger2.default.warn('unsupported method');
    buf.writeUInt16BE(0x05FF);
    connection.write(buf);
    return -1;
  }

  buf.writeUInt16BE(0x0500);
  connection.write(buf);

  return 1;
}

function handleRequest(connection, data, remoteAddr, remotePort, password, method) {
  var cmd = data[1];
  // TODO: most dst infos are not used
  var dstInfo = (0, _utils.getDstInfo)(data);
  var repBuf = new Buffer(10);
  // TODO: support domain and ipv6
  var clientOptions = {
    port: remotePort,
    host: remoteAddr
  };

  var clientToRemote = void 0;
  var tmp = null;
  var decipher = null;

  if (cmd !== 0x01) {
    _logger2.default.warn('unsupported cmd');
    return {
      stage: -1
    };
  }

  if (!dstInfo) {
    return {
      stage: -1
    };
  }

  clientToRemote = (0, _net.connect)(clientOptions);

  // TODO: should pause until the replay finished
  clientToRemote.on('data', function (remoteData) {
    // TODO:
    if (!decipher) {
      tmp = (0, _encryptor.createDecipher)(password, method, remoteData);
      decipher = tmp.decipher;
      connection.write(tmp.data);
    } else {
      connection.write(decipher.update(remoteData));
    }
  });

  clientToRemote.on('close', function () {
    connection.destroy();
  });

  connection.on('error', function (e) {
    _logger2.default.warn('ssLocal error happened: ' + e.message);
    connection.destroy();
  });

  tmp = (0, _encryptor.createCipher)(password, method, data);

  clientToRemote.write(tmp.data);

  // +----+-----+-------+------+----------+----------+
  // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+

  // TODO: should fill BND fields with 0?
  repBuf.writeUInt16BE(0x0500);
  repBuf.writeUInt16BE(dstInfo.atyp, 2);
  // TODO: why?
  repBuf.writeUInt32BE(0x00000000, 4, 4);
  repBuf.writeUInt32BE(2222, 8, 2);

  connection.write(repBuf);

  return {
    stage: 2,
    cipher: tmp.cipher,
    clientToRemote: clientToRemote
  };
}

function handleConnection(config, connection) {
  var stage = 0;
  var clientToRemote = void 0;
  var tmp = void 0;
  var cipher = void 0;

  connection.on('data', function (data) {
    switch (stage) {
      case 0:
        _logger2.default.debug('ssLocal at stage ' + stage + ' received data: ' + data.toString('hex'));

        stage = handleMethod(connection, data);
        break;
      case 1:
        _logger2.default.debug('ssLocal at stage ' + stage + ' received data: ' + data.toString('hex'));

        tmp = handleRequest(connection, data, config.server, config.server_port, config.password, config.method);
        clientToRemote = tmp.clientToRemote;
        stage = tmp.stage;
        cipher = tmp.cipher;

        break;
      case 2:
        _logger2.default.debug('ssLocal at stage ' + stage + ' received data: ' + data.toString('hex'));
        clientToRemote.write(cipher.update(data));
        break;
      default:
        return;
    }

    connection.on('error', function (e) {
      _logger2.default.warn('ssLocal error happened: ' + e.message);

      if (clientToRemote) {
        clientToRemote.destroy();
      }
    });

    if (stage === -1) {
      connection.destroy();
    }
  });
}

function createServer(config) {
  var server = (0, _net.createServer)(handleConnection.bind(null, config));

  server.on('close', function () {
    // TODO:
  });

  server.on('error', function () {
    // TODO:
  });

  return server;
}

function startServer() {
  var config = (0, _utils.getConfig)();

  // TODO: throw when the port is occupied
  var server = createServer(config).listen(config.local_port);

  return server;
}