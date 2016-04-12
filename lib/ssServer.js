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

function flushPreservedData(connection, dataArr) {
  var i = dataArr.length;

  while (i > 0) {
    i--;
    connection.write(dataArr[i]);
    _logger2.default.debug(dataArr[i].toString('ascii'));
  }

  dataArr.length = 0;
}

function createClientToDst(connection, data, preservedData, password, method) {
  var dstInfo = (0, _utils.getDstInfo)(data);
  var client = void 0;
  var clientOptions = void 0;
  var cipher = null;
  var tmp = void 0;

  if (!dstInfo) {
    return null;
  }

  // console.log(dstInfo);
  // console.log(data.slice(dstInfo.totalLength).toString('ascii'));
  preservedData.push(data.slice(dstInfo.totalLength));

  clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: dstInfo.atyp === 3 ? dstInfo.dstAddr.toString('ascii') : (0, _utils.inetNtoa)(dstInfo.dstAddr)
  };

  client = (0, _net.connect)(clientOptions);

  client.on('data', function (clientData) {
    _logger2.default.debug('server received data from DST:' + clientData.toString('ascii'));
    if (!cipher) {
      tmp = (0, _encryptor.createCipher)(password, method, clientData);
      cipher = tmp.cipher;
      connection.write(tmp.data);
    } else {
      connection.write(cipher.update(clientData));
    }
  });

  client.on('close', function () {
    connection.destroy();
  });

  client.on('error', function (e) {
    _logger2.default.warn('ssServer error happened: ' + e.message);
    connection.destroy();
  });

  return client;
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

        clientToDst = createClientToDst(connection, data, preservedData, config.password, config.method);

        if (!clientToDst) {
          // TODO: throw
          connection.destroy();
          return;
        }

        flushPreservedData(clientToDst, preservedData);

        stage = 1;
        break;
      case 1:
        _logger2.default.debug('server at stage ' + stage + ' received data: ' + data.toString('ascii'));

        clientToDst.write(data);
        break;
      default:
        return;
    }
  });

  connection.on('error', function (e) {
    _logger2.default.warn('ssServer error happened: ' + e.message);

    if (clientToDst) {
      clientToDst.destroy();
    }
  });
}

function createServer(config) {
  var server = (0, _net.createServer)(handleConnection.bind(null, config));

  return server;
}

function startServer() {
  var config = (0, _utils.getConfig)();

  // TODO: port occupied
  var server = createServer(config).listen(config.server_port);

  return server;
}