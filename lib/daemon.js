'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = daemon;

var _child_process = require('child_process');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _cli = require('./cli');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NAME = 'daemon';
var MAX_RESTART_TIME = 5;

function forkProcess(config, filePath, _restartTime) {
  var restartTime = _restartTime || 0;

  var child = (0, _child_process.fork)(filePath);

  child.send(config);

  setTimeout(function () {
    restartTime = 0;
  }, 60 * 1000);

  child.on('exit', function () {
    _logger2.default.warn(NAME + ': process exit.');

    child.kill('SIGKILL');

    if (restartTime < MAX_RESTART_TIME) {
      forkProcess(config, filePath, restartTime + 1);
    } else {
      _logger2.default.error(NAME + ': restarted too many times, will close.');
      process.exit(1);
    }
  });
}

function daemon(filePath) {
  var _getConfig = (0, _cli.getConfig)();

  var generalOptions = _getConfig.generalOptions;
  var proxyOptions = _getConfig.proxyOptions;


  if (generalOptions.help) {
    (0, _cli.logHelp)();
  } else {
    forkProcess(proxyOptions, filePath);
  }
}

module.exports = daemon;