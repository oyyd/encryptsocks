'use strict';

exports.__esModule = true;
exports.FORK_FILE_PATH = undefined;

var _path = require('path');

var _child_process = require('child_process');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _cli = require('./cli');

var _pid = require('./pid');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NAME = 'daemon';
var MAX_RESTART_TIME = 5;

var child = null;

var FORK_FILE_PATH = exports.FORK_FILE_PATH = {
  local: (0, _path.join)(__dirname, 'ssLocal'),
  server: (0, _path.join)(__dirname, 'ssServer')
};

function daemon(type, config, filePath, _restartTime) {
  var restartTime = _restartTime || 0;

  child = (0, _child_process.fork)(filePath);

  child.send(config);

  setTimeout(function () {
    restartTime = 0;
  }, 60 * 1000);

  child.on('exit', function () {
    _logger2.default.warn(NAME + ': process exit.');

    child.kill('SIGKILL');

    if (restartTime < MAX_RESTART_TIME) {
      daemon(type, config, filePath, restartTime + 1);
    } else {
      _logger2.default.error(NAME + ': restarted too many times, will close.');
      (0, _pid.deletePidFile)(type);
      process.exit(1);
    }
  });
}

process.on('SIGHUP', function () {
  if (child) {
    child.kill('SIGKILL');
  }
  (0, _pid.deletePidFile)();
  process.exit(0);
});

if (module === require.main) {
  var type = process.argv[2];
  var argv = process.argv.slice(3);

  var _getConfig = (0, _cli.getConfig)(argv);

  var proxyOptions = _getConfig.proxyOptions;


  daemon(type, proxyOptions, FORK_FILE_PATH[type]);
}