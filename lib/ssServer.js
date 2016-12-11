'use strict';

exports.__esModule = true;
exports.startServer = startServer;

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _net = require('net');

var _utils = require('./utils');

var _logger = require('./logger');

var _encryptor = require('./encryptor');

var _createUDPRelay = require('./createUDPRelay');

var _createUDPRelay2 = _interopRequireDefault(_createUDPRelay);

var _recordMemoryUsage = require('./recordMemoryUsage');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NAME = 'ss_server';

var logger = void 0;

function createClientToDst(connection, data, password, method, onConnect, onDestroy, isLocalConnected) {
  var dstInfo = (0, _utils.getDstInfo)(data, true);

  var cipher = null;
  var tmp = void 0;
  var cipheredData = void 0;
  var preservedData = null;

  if (!dstInfo) {
    logger.warn(NAME + ' receive invalid msg. ' + 'local method/password doesn\'t accord with the server\'s?');
    return null;
  }

  var clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: dstInfo.atyp === 3 ? dstInfo.dstAddr.toString('ascii') : _ip2.default.toString(dstInfo.dstAddr)
  };

  if (dstInfo.totalLength < data.length) {
    preservedData = data.slice(dstInfo.totalLength);
  }

  var clientToDst = (0, _net.connect)(clientOptions, onConnect);

  clientToDst.on('data', function (clientData) {
    if (!cipher) {
      tmp = (0, _encryptor.createCipher)(password, method, clientData);
      cipher = tmp.cipher;
      cipheredData = tmp.data;
    } else {
      cipheredData = cipher.update(clientData);
    }

    if (isLocalConnected()) {
      (0, _utils.writeOrPause)(clientToDst, connection, cipheredData);
    } else {
      clientToDst.destroy();
    }
  });

  clientToDst.on('drain', function () {
    connection.resume();
  });

  clientToDst.on('end', function () {
    if (isLocalConnected()) {
      connection.end();
    }
  });

  clientToDst.on('error', function (e) {
    logger.warn('ssServer error happened when write to DST: ' + e.message);
    onDestroy();
  });

  clientToDst.on('close', function (e) {
    if (isLocalConnected()) {
      if (e) {
        connection.destroy();
      } else {
        connection.end();
      }
    }
  });

  return {
    clientToDst: clientToDst, preservedData: preservedData
  };
}

function handleConnection(config, connection) {
  var stage = 0;
  var clientToDst = null;
  var decipher = null;
  var tmp = void 0;
  var data = void 0;
  var localConnected = true;
  var dstConnected = false;
  var timer = null;

  connection.on('data', function (chunck) {
    try {
      if (!decipher) {
        tmp = (0, _encryptor.createDecipher)(config.password, config.method, chunck);
        decipher = tmp.decipher;
        data = tmp.data;
      } else {
        data = decipher.update(chunck);
      }
    } catch (e) {
      logger.warn(NAME + ' receive invalid data');
      return;
    }

    switch (stage) {
      case 0:
        // TODO: should pause? or preserve data?
        connection.pause();

        tmp = createClientToDst(connection, data, config.password, config.method, function () {
          dstConnected = true;
          connection.resume();
        }, function () {
          if (dstConnected) {
            dstConnected = false;
            clientToDst.destroy();
          }

          if (localConnected) {
            localConnected = false;
            connection.destroy();
          }
        }, function () {
          return localConnected;
        });

        if (!tmp) {
          connection.destroy();
          return;
        }

        clientToDst = tmp.clientToDst;

        if (tmp.preservedData) {
          (0, _utils.writeOrPause)(connection, clientToDst, tmp.preservedData);
        }

        stage = 1;
        break;
      case 1:
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
    localConnected = false;

    if (dstConnected) {
      clientToDst.end();
    }
  });

  connection.on('error', function (e) {
    logger.warn('ssServer error happened in the connection with ssLocal : ' + e.message);
  });

  connection.on('close', function (e) {
    if (timer) {
      clearTimeout(timer);
    }

    localConnected = false;

    if (dstConnected) {
      if (e) {
        clientToDst.destroy();
      } else {
        clientToDst.end();
      }
    }
  });

  timer = setTimeout(function () {
    if (localConnected) {
      connection.destroy();
    }

    if (dstConnected) {
      clientToDst.destroy();
    }
  }, config.timeout * 1000);
}

function createServer(config) {
  var server = (0, _net.createServer)(handleConnection.bind(null, config)).listen(config.serverPort);
  var udpRelay = (0, _createUDPRelay2.default)(config, true, logger);

  server.on('close', function () {
    logger.warn(NAME + ' server closed');
  });

  server.on('error', function (e) {
    logger.error(NAME + ' server error: ' + e.message);
  });

  logger.verbose(NAME + ' is listening on ' + config.serverAddr + ':' + config.serverPort);

  return {
    server: server, udpRelay: udpRelay
  };
}

// eslint-disable-next-line
function startServer(config) {
  var willLogToConsole = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  logger = logger || (0, _logger.createLogger)(config.level, _logger.LOG_NAMES.SERVER, willLogToConsole);

  return createServer(config);
}

if (module === require.main) {
  process.on('message', function (config) {
    logger = (0, _logger.createLogger)(config.level, _logger.LOG_NAMES.SERVER, false);

    startServer(config, false);

    // NOTE: DEV only
    // eslint-disable-next-line
    if (config._recordMemoryUsage) {
      setInterval(function () {
        process.send(process.memoryUsage());
      }, _recordMemoryUsage.INTERVAL_TIME);
    }
  });

  process.on('uncaughtException', function (err) {
    logger.error(NAME + ' uncaughtException: ' + err.stack, (0, _utils.createSafeAfterHandler)(logger, function () {
      process.exit(1);
    }));
  });
}