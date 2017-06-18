'use strict';

exports.__esModule = true;
exports.LOG_NAMES = undefined;
exports.createLogger = createLogger;

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _path = require('path');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var LOG_NAMES = exports.LOG_NAMES = {
  LOCAL: 'local.log',
  SERVER: 'server.log',
  DAEMON: 'daemon.log'
};

var PATH_PREFIX = (0, _path.join)(__dirname, '../logs');
var DEFAULT_LEVEL = 'warn';
var DEFAULT_COMMON_OPTIONS = {
  colorize: true,
  timestamp: true
};

// TODO: to be refactored
function createLogData(level, filename, willLogToConsole, notLogToFile) {
  var transports = [];

  if (!notLogToFile) {
    transports.push(new _winston2.default.transports.File(Object.assign(DEFAULT_COMMON_OPTIONS, {
      level: level, filename: filename
    })));
  }

  if (willLogToConsole) {
    transports.push(new _winston2.default.transports.Console(Object.assign(DEFAULT_COMMON_OPTIONS, {
      level: level
    })));
  }

  return {
    transports: transports
  };
}

function createLogger() {
  var level = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_LEVEL;
  var logName = arguments[1];
  var willLogToConsole = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var notLogToFile = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

  (0, _utils.mkdirIfNotExistSync)(PATH_PREFIX);
  var fileName = (0, _path.join)(PATH_PREFIX, logName);
  return new _winston2.default.Logger(createLogData(level, fileName, willLogToConsole, notLogToFile));
}