'use strict';

exports.__esModule = true;
exports.FORK_FILE_PATH = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /**
                                                                                                                                                                                                                                                                               * Daemon ss processes.
                                                                                                                                                                                                                                                                               * 1. start, stop, restart
                                                                                                                                                                                                                                                                               * 2. know the previous process running status
                                                                                                                                                                                                                                                                               * 3. log and logrotate
                                                                                                                                                                                                                                                                               */


exports.start = start;
exports.stop = stop;
exports.restart = restart;

var _pm = require('pm2');

var _pm2 = _interopRequireDefault(_pm);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _pid = require('./pid');

var _config2 = require('./config');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// eslint-disable-next-line
var log = console.log;

// const LOG_ROTATE_OPTIONS = {
//   maxSize: '1KB',
//   retain: 7,
//   workerInterval: 60,
//   rotateInterval: '*/1 * * * *',
// };

var FORK_FILE_PATH = exports.FORK_FILE_PATH = {
  local: _path2.default.join(__dirname, 'ssLocal.js'),
  server: _path2.default.join(__dirname, 'ssServer.js')
};

var pm2ProcessName = {
  local: 'ssLocal',
  server: 'ssServer'
};

function getArgs(extralProxyOptions) {
  if (typeof extralProxyOptions === 'string') {
    return extralProxyOptions;
  }

  // TODO: support "stringify"
  if ((typeof extralProxyOptions === 'undefined' ? 'undefined' : _typeof(extralProxyOptions)) === 'object') {
    return (0, _config2.stringifyProxyOptions)(extralProxyOptions);
  }

  return process.argv.slice(2).join(' ');
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

function getPM2Config(type, extralProxyOptions) {
  return connect().then(function () {
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
      args: getArgs(extralProxyOptions)
    };

    return {
      pm2Config: pm2Config
    };
  });
}

function _start(type, extralProxyOptions) {
  return getPM2Config(type, extralProxyOptions).then(function (_ref) {
    var pm2Config = _ref.pm2Config;
    return new Promise(function (resolve) {
      _pm2.default.start(pm2Config, function (err, apps) {
        if (err) {
          throw err;
        }

        log('start');
        resolve(apps);
      });
    });
  }).then(function () {
    return disconnect();
  });
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

function _stop(type, extralProxyOptions) {
  var config = null;

  return getPM2Config(type, extralProxyOptions).then(function (conf) {
    config = conf;
    var name = config.pm2Config.name;

    return getRunningInfo(name);
  }).then(function (isRunning) {
    var _config = config,
        pm2Config = _config.pm2Config;
    var name = pm2Config.name;


    if (!isRunning) {
      log('already stopped');
      return;
    }

    // eslint-disable-next-line
    return new Promise(function (resolve) {
      _pm2.default.stop(name, function (err) {
        if (err && err.message !== 'process name not found') {
          throw err;
        }

        log('stop');
        resolve();
      });
    });
  }).then(function () {
    return disconnect();
  });
}

/**
 * @public
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
function start() {
  return _start.apply(undefined, arguments).catch(handleError);
}

/**
 * @public
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
function stop() {
  return _stop.apply(undefined, arguments).catch(handleError);
}

/**
 * @public
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
function restart() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return _stop.apply(undefined, args).then(function () {
    return _start.apply(undefined, args);
  }).catch(handleError);
}

// if (module === require.main) {
//   restart('local', {
//     password: 'holic123',
//     serverAddr: 'kr.oyyd.net',
//   });
// }