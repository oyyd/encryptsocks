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

function flushPreservedData(connection, clientToDst, dataArr) {
  var i = dataArr.length;

  while (i > 0) {
    i--;
    (0, _utils.writeOrPause)(connection, clientToDst, dataArr[i]);
  }

  dataArr.length = 0;
}

function createClientToDst(connection, data, preservedData, password, method, cb) {
  var dstInfo = (0, _utils.getDstInfo)(data, true);

  var clientToDst = void 0;
  var clientOptions = void 0;
  var cipher = null;
  var tmp = void 0;

  if (!dstInfo) {
    return null;
  }

  if (dstInfo.totalLength < data.length) {
    preservedData.push(data.slice(dstInfo.totalLength));
  }

  clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: dstInfo.atyp === 3 ? dstInfo.dstAddr.toString('ascii') : (0, _utils.inetNtoa)(dstInfo.dstAddr)
  };

  clientToDst = (0, _net.connect)(clientOptions, cb);

  clientToDst.on('data', function (clientData) {
    _logger2.default.debug('server received data from DST:' + clientData.toString('ascii'));
    if (!cipher) {
      tmp = (0, _encryptor.createCipher)(password, method, clientData);
      cipher = tmp.cipher;
      (0, _utils.writeOrPause)(clientToDst, connection, tmp.data);
    } else {
      (0, _utils.writeOrPause)(clientToDst, connection, cipher.update(clientData));
    }
  });

  clientToDst.on('drain', function () {
    connection.resumse();
  });

  clientToDst.on('end', function () {
    connection.end();
  });

  clientToDst.on('error', function (e) {
    _logger2.default.warn('ssServer error happened when write to DST: ' + e.message);
    connection.destroy();
  });

  return clientToDst;
}

function handleConnection(config, connection) {
  var preservedData = [];

  var stage = 0;
  var clientToDst = null;
  var decipher = null;
  var tmp = void 0;

  connection.on('data', function (data) {
    if (!decipher) {
      tmp = (0, _encryptor.createDecipher)(config.password, config.method, data);
      decipher = tmp.decipher;
      data = tmp.data;
    } else {
      data = decipher.update(data);
    }

    switch (stage) {
      case 0:
        _logger2.default.debug('server at stage ' + stage + ' received data: ' + data.toString('hex'));

        // TODO: should pause? or preserve data?
        connection.pause();

        clientToDst = createClientToDst(connection, data, preservedData, config.password, config.method, function () {
          connection.resume();
        });

        if (!clientToDst) {
          // TODO: throw
          connection.destroy();
          return;
        }

        flushPreservedData(connection, clientToDst, preservedData);

        stage = 1;
        break;
      case 1:
        _logger2.default.debug('server at stage ' + stage + ' received data: ' + data.toString('ascii'));

        (0, _utils.writeOrPause)(connection, clientToDst, data);

        break;
      default:
        return;
    }
  });

  connection.on('drain', function () {
    clientToDst.resume();
  });

  connection.on('end', function () {
    clientToDst.end();
  });

  connection.on('error', function (e) {
    _logger2.default.warn('ssServer error happened in the connection with ssLocal : ' + e.message);

    if (clientToDst) {
      connection.destroy();
      clientToDst.destroy();
    }
  });
}

function createServer(config) {
  var server = (0, _net.createServer)(handleConnection.bind(null, config));

  return server;
}

function startServer() {
  var argv = (0, _utils.getArgv)();

  var config = (0, _utils.getConfig)();

  if (argv.level) {
    (0, _logger.changeLevel)(_logger2.default, argv.level);
  }

  // TODO: port occupied
  var server = createServer(config).listen(config.server_port);

  return server;
}