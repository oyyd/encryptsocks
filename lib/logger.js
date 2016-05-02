'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.changeLevel = changeLevel;

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DEFAULT_LEVEL = 'warn';
var DEFAULT_COMMON_OPTIONS = {
  colorize: true,
  timestamp: true
};
var DEFAULT_FILE_OPTIONS = {
  filename: 'log.log'
};

function createLogData(level) {
  return {
    transports: [new _winston2.default.transports.Console(Object.assign(DEFAULT_COMMON_OPTIONS, {
      level: level
    })), new _winston2.default.transports.File(Object.assign(DEFAULT_COMMON_OPTIONS, DEFAULT_FILE_OPTIONS, {
      level: level
    }))]
  };
}

function changeLevel(logger, level) {
  logger.configure(createLogData(level));
}

var logger = new _winston2.default.Logger(createLogData(DEFAULT_LEVEL));

exports.default = logger;