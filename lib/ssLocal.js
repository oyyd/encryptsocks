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

var _filter = require('./filter');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO: remove or handle
var _id = 0;

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
  _logger2.default.debug('1. TRY TO WRITE: ' + buf);
  connection.write(buf);

  return 1;
}

function handleRequest(connection, data, remoteAddr, remotePort, password, method, dstInfo) {
  var cmd = data[1];
  // TODO: most dst infos are not used
  var repBuf = new Buffer(10);
  // TODO: support domain and ipv6
  var clientOptions = {
    port: remotePort,
    host: remoteAddr
  };

  var clientToRemote = void 0;
  var tmp = null;
  var decipher = null;
  var decipheredData = null;
  var cipher = null;
  var cipheredData = null;

  _logger2.default.verbose('connecting: ' + dstInfo.dstAddr.toString('utf8') + ':' + dstInfo.dstPort.readUInt16BE());

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

  // prepare data

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

  tmp = (0, _encryptor.createCipher)(password, method, data.slice(3)); // skip VER, CMD, RSV
  _logger2.default.warn(data.slice(3).toString('hex'));
  cipher = tmp.cipher;
  cipheredData = tmp.data;

  // connect

  clientToRemote = (0, _net.connect)(clientOptions);

  // TODO: should pause until the replay finished
  clientToRemote.on('data', function (remoteData) {
    // TODO:
    if (!decipher) {
      tmp = (0, _encryptor.createDecipher)(password, method, remoteData);
      decipher = tmp.decipher;
      decipheredData = tmp.data;
    } else {
      decipheredData = decipher.update(remoteData);
    }

    _logger2.default.debug('ssLocal received data from remote: ' + decipheredData.toString('hex'));
    (0, _utils.writeOrPause)(clientToRemote, connection, decipheredData);
  });

  clientToRemote.on('drain', function () {
    connection.resume();
  });

  clientToRemote.on('end', function () {
    connection.end();
  });

  clientToRemote.on('error', function (e) {
    _logger2.default.warn('ssLocal error happened in clientToRemote when connecting to ' + (0, _utils.getDstStr)(dstInfo) + ': ' + e.message);
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

  // TODO: write before connected
  (0, _utils.writeOrPause)(connection, clientToRemote, cipheredData);

  return {
    stage: 2,
    cipher: cipher,
    clientToRemote: clientToRemote
  };
}

function handleConnection(config, connection) {
  var id = _id++;
  var preservedData = [];

  var stage = 0;
  var clientToRemote = void 0;
  var tmp = void 0;
  var cipher = void 0;
  var dstInfo = void 0;

  connection.on('data', function (data) {
    switch (stage) {
      case 0:
        _logger2.default.debug('ssLocal(' + id + ') at stage ' + stage + ' received data from client: ' + data.toString('hex'));

        stage = handleMethod(connection, data);

        break;
      case 1:
        dstInfo = (0, _utils.getDstInfo)(data);

        // TODO:
        if (!(0, _filter.filter)(dstInfo)) {
          // TODO: clean everything
          connection.end();
          connection.destroy();
          stage = -1;
          return;
        }

        _logger2.default.debug('ssLocal(' + id + ') at stage ' + stage + ' received data from client: ' + data.toString('hex'));

        tmp = handleRequest(connection, data, config.server, config.server_port, config.password, config.method, dstInfo);
        clientToRemote = tmp.clientToRemote;
        stage = tmp.stage;
        cipher = tmp.cipher;

        break;
      case 2:
        tmp = cipher.update(data);
        _logger2.default.debug('ssLocal(' + id + ') at stage ' + stage + ' received data from client and write to remote: ' + tmp.toString('hex'));

        (0, _utils.writeOrPause)(connection, clientToRemote, tmp);

        break;
      default:
        return;
    }
  });

  connection.on('drain', function () {
    console.log('DRAIN');
    clientToRemote.resume();
  });

  connection.on('end', function () {
    // TODO: test existence
    if (clientToRemote) {
      clientToRemote.end();
    }
  });

  connection.on('close', function (e) {
    if (clientToRemote) {
      if (e) {
        clientToRemote.destroy();
      } else {
        clientToRemote.end();
      }
    }
  });

  connection.on('error', function (e) {
    _logger2.default.warn('ssLocal error happened in client connection: ' + e.message);
  });

  if (stage === -1) {
    connection.destroy();
  }
}

function createServer(config) {
  var server = (0, _net.createServer)(handleConnection.bind(null, config));

  server.on('close', function () {
    // TODO:
  });

  server.on('error', function (e) {
    // TODO:
    _logger2.default.warn('ssLocal server error: ' + e.message);
  });

  return server;
}

function startServer() {
  var argv = (0, _utils.getArgv)();

  var config = (0, _utils.getConfig)();

  if (argv.level) {
    (0, _logger.changeLevel)(_logger2.default, argv.level);
  }

  // TODO: throw when the port is occupied
  var server = createServer(config).listen(config.local_port);

  return server;
}