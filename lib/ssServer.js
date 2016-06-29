'use strict';

exports.__esModule = true;
exports.startServer = startServer;

var _utils = require('./utils');

var _logger = require('./logger');

var _recordMemoryUsage = require('./recordMemoryUsage');

var _createServerTCPRelay = require('./createServerTCPRelay');

var _createUDPRelay = require('./createUDPRelay');

var _createUDPRelay2 = _interopRequireDefault(_createUDPRelay);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NAME = 'ss_server';

var logger = void 0;

function closeAll() {
  (0, _utils.closeSilently)(this.udpRelay);
  this.tcpRelay.close();
}

function startServer(config) {
  var willLogToConsole = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

  logger = logger || (0, _logger.createLogger)(config.level, _logger.LOG_NAMES.SERVER, willLogToConsole);

  var tcpRelay = (0, _createServerTCPRelay.createServer)(config, logger);
  var udpRelay = (0, _createUDPRelay2.default)(config, true, logger);

  return {
    tcpRelay: tcpRelay, udpRelay: udpRelay, closeAll: closeAll
  };
}

if (module === require.main) {
  process.on('message', function (config) {
    logger = (0, _logger.createLogger)(config.level, _logger.LOG_NAMES.SERVER, false);

    startServer(config, false);

    // NOTE: DEV only
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