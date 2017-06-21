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

var DEFAULT_LEVEL = 'warn';
var DEFAULT_COMMON_OPTIONS = {
  colorize: true,
  timestamp: true
};

// TODO: to be refactored
function createLogData(level, filename, willLogToConsole, notLogToFile) {
  var transports = [];

  if (filename && !notLogToFile) {
    transports.push(new _winston2.default.transports.File(Object.assign(DEFAULT_COMMON_OPTIONS, {
      level: level,
      filename: filename
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

function createLogger(proxyOptions, logName) {
  var willLogToConsole = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var notLogToFile = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

  var _ref = proxyOptions || {},
      _ref$level = _ref.level,
      level = _ref$level === undefined ? DEFAULT_LEVEL : _ref$level,
      logPath = _ref.logPath;

  if (logPath) {
    (0, _utils.mkdirIfNotExistSync)(logPath);
  }

  var fileName = logPath ? (0, _path.resolve)(logPath, logName) : null;
  return new _winston2.default.Logger(createLogData(level, fileName, willLogToConsole, notLogToFile));
}