'use strict';

exports.__esModule = true;
exports.FORK_FILE_PATH = undefined;
exports.stop = stop;
exports.get = get;

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
 */
var FORK_FILE_PATH = exports.FORK_FILE_PATH = {
  local: _path2.default.join(__dirname, 'ssLocal.js'),
  server: _path2.default.join(__dirname, 'ssServer.js')
};

var pm2ProcessName = {
  local: 'ssLocal',
  server: 'ssServer'
};

function getDaemonInfo() {
  var type = process.argv[2];
  var argv = process.argv.slice(3);

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

function getPM2Config() {
  return connect().then(getDaemonInfo).then(function (info) {
    var type = info.type;


    var filePath = FORK_FILE_PATH[type];
    var pidFileName = (0, _pid.getFileName)(type);
    var name = pm2ProcessName[type];

    var pm2Config = {
      name: name,
      script: filePath,
      exec_mode: 'fork',
      instances: 1,
      pid_file: pidFileName,
      args: process.argv.slice(3).join(' ')
    };

    return {
      info: info,
      pm2Config: pm2Config
    };
  });
}

function start() {
  var config = null;

  return getPM2Config().then(function (_ref) {
    var pm2Config = _ref.pm2Config,
        info = _ref.info;

    config = info.config;

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
  }).then(function () {
    return disconnect();
  }).catch(handleError);
}

function stop() {
  return getPM2Config().then(function (_ref2) {
    var info = _ref2.info;
    var type = info.type;

    var name = pm2ProcessName[type];

    return new Promise(function (resolve) {
      _pm2.default.stop(name, function (err) {
        if (err) {
          throw err;
        }

        resolve();
      });
    });
  }).then(function () {
    return disconnect();
  }).catch(handleError);
}

function get() {}

if (require.main === module) {
  start();
}