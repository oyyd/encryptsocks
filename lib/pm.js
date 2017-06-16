'use strict';

exports.__esModule = true;
exports.FORK_FILE_PATH = undefined;
exports.getDaemon = getDaemon;

var _pm = require('pm2');

var _pm2 = _interopRequireDefault(_pm);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _cli = require('./cli');

var _pid = require('./pid');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } /**
                                                                                                                                                           * Daemon ss processes.
                                                                                                                                                           * 1. start, stop, restart
                                                                                                                                                           * 2. know the previous process running status
                                                                                                                                                           */


var FORK_FILE_PATH = exports.FORK_FILE_PATH = {
  local: _path2.default.join(__dirname, 'ssLocal.js'),
  server: _path2.default.join(__dirname, 'ssServer.js')
};

function getDaemonInfo() {
  var type = process.argv[2];
  var argv = process.argv.slice(3);

  return new Promise(function (resolve) {
    (0, _cli.getConfig)(argv, function (err, config) {
      if (err) {
        throw err;
      }

      resolve({
        type: type,
        config: config
      });
    });
  });
}

function connect() {
  return new Promise(function (resolve) {
    _pm2.default.connect(function (err) {
      if (err) {
        throw err;
      }

      resolve();
    });
  });
}

function handleError(err) {
  // TODO:
  // eslint-disable-next-line
  console.error(err);
}

function sendDataToPMId(id, data) {
  return connect().then(function () {
    return _pm2.default.sendDataToProcessId(id, {
      type: 'process:msg',
      data: data
    });
  });
}

var Daemon = function () {
  function Daemon(_ref) {
    var type = _ref.type,
        config = _ref.config;

    _classCallCheck(this, Daemon);

    this.type = type;
    this.config = config;
  }

  Daemon.prototype.start = function start() {
    var type = null;
    var config = null;

    return connect().then(getDaemonInfo).then(function (info) {
      config = info.config;
      type = info.type;

      var filePath = FORK_FILE_PATH[type];
      var pidFileName = (0, _pid.getFileName)(type);

      var pm2Config = {
        script: filePath,
        exec_mode: 'fork',
        instances: 1,
        pid_file: pidFileName
      };

      return new Promise(function (resolve) {
        _pm2.default.start(pm2Config, function (err, apps) {
          if (err) {
            throw err;
          }

          resolve(apps);
        });
      });
    }).then(function (apps) {
      if (!Array.isArray(apps) || apps.length < 1) {
        throw new Error('failed to exec scripts');
      }

      var app = apps[0];
      var pm_id = app.pm2_env.pm_id;
      var _config = config,
          proxyOptions = _config.proxyOptions;


      return sendDataToPMId(pm_id, proxyOptions);
    }).catch(handleError);
  };

  Daemon.prototype.stop = function stop() {};

  Daemon.prototype.restart = function restart() {};

  return Daemon;
}();

// eslint-disable-next-line


function getDaemon(type, config) {
  return new Daemon({ type: type, config: config });
}

if (require.main === module) {
  getDaemon().start();
}