'use strict';

exports.__esModule = true;
exports.FORK_FILE_PATH = undefined;
exports.start = start;
exports.stop = stop;
exports.restart = restart;

var _pm = require('pm2');

var _pm2 = _interopRequireDefault(_pm);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _config2 = require('./config');

var _pid = require('./pid');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Daemon ss processes.
 * 1. start, stop, restart
 * 2. know the previous process running status
 * 3. log and logrotate
 */
var FORK_FILE_PATH = exports.FORK_FILE_PATH = {
  local: _path2.default.join(__dirname, 'ssLocal.js'),
  server: _path2.default.join(__dirname, 'ssServer.js')
};

var pm2ProcessName = {
  local: 'ssLocal',
  server: 'ssServer'
};

function getArgs() {
  return process.argv.slice(2);
}

function getDaemonInfo(type) {
  // TODO: refactor this
  var argv = getArgs();

  return new Promise(function (resolve) {
    (0, _config2.getConfig)(argv, function (err, config) {
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

function disconnect() {
  return new Promise(function (resolve) {
    _pm2.default.disconnect(function (err) {
      if (err) {
        throw err;
      }

      resolve();
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
  return disconnect().then(function () {
    // TODO:
    // eslint-disable-next-line
    console.error(err);
  });
}

function getPM2Config(_type) {
  return connect().then(getDaemonInfo.bind(null, _type)).then(function (info) {
    var type = info.type;


    var filePath = FORK_FILE_PATH[type];
    var pidFileName = (0, _pid.getFileName)(type);
    var name = pm2ProcessName[type];

    var pm2Config = {
      name: name,
      script: filePath,
      exec_mode: 'fork',
      instances: 1,
      output: _path2.default.resolve(__dirname, '../logs/' + name + '.log'),
      error: _path2.default.resolve(__dirname, '../logs/' + name + '.err'),
      pid: pidFileName,
      minUptime: 2000,
      maxRestarts: 3,
      args: getArgs().join(' ')
    };

    return {
      info: info,
      pm2Config: pm2Config
    };
  });
}

function _start(type) {
  return getPM2Config(type).then(function (_ref) {
    var pm2Config = _ref.pm2Config;
    return new Promise(function (resolve) {
      _pm2.default.start(pm2Config, function (err, apps) {
        if (err) {
          throw err;
        }

        resolve(apps);
      });
    });
  }).then(function () {
    return disconnect();
  });
}

function start(type) {
  return _start(type).catch(handleError);
}

function getRunningInfo(name) {
  return new Promise(function (resolve) {
    _pm2.default.describe(name, function (err, descriptions) {
      if (err) {
        throw err;
      }

      // TODO: there should not be more than one process
      //  “online”, “stopping”,
      //  “stopped”, “launching”,
      //  “errored”, or “one-launch-status”
      var status = descriptions.length > 0 && descriptions[0].pm2_env.status !== 'stopped' && descriptions[0].pm2_env.status !== 'errored';

      resolve(status);
    });
  });
}

function _stop(type) {
  var config = null;

  return getPM2Config(type).then(function (conf) {
    config = conf;
    var name = config.pm2Config.name;

    return getRunningInfo(name);
  }).then(function () {
    var _config = config,
        pm2Config = _config.pm2Config;
    var name = pm2Config.name;


    return new Promise(function (resolve) {
      _pm2.default.stop(name, function (err) {
        if (err && err.message !== 'process name not found') {
          throw err;
        }

        resolve();
      });
    });
  }).then(function () {
    return disconnect();
  });
}

function stop(type) {
  return _stop(type).catch(handleError);
}

function restart(type) {
  return _stop(type).then(function () {
    return _start(type);
  }).catch(handleError);
}

if (require.main === module) {
  // stop('local');
  restart('local');
}