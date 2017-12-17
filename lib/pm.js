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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wbS5qcyJdLCJuYW1lcyI6WyJzdGFydCIsInN0b3AiLCJyZXN0YXJ0IiwibG9nIiwiY29uc29sZSIsIkZPUktfRklMRV9QQVRIIiwibG9jYWwiLCJqb2luIiwiX19kaXJuYW1lIiwic2VydmVyIiwicG0yUHJvY2Vzc05hbWUiLCJnZXRBcmdzIiwiZXh0cmFsUHJveHlPcHRpb25zIiwicHJvY2VzcyIsImFyZ3YiLCJzbGljZSIsImRpc2Nvbm5lY3QiLCJQcm9taXNlIiwicmVzb2x2ZSIsImVyciIsImNvbm5lY3QiLCJoYW5kbGVFcnJvciIsInRoZW4iLCJlcnJvciIsImdldFBNMkNvbmZpZyIsInR5cGUiLCJmaWxlUGF0aCIsInBpZEZpbGVOYW1lIiwibmFtZSIsInBtMkNvbmZpZyIsInNjcmlwdCIsImV4ZWNfbW9kZSIsImluc3RhbmNlcyIsIm91dHB1dCIsInBpZCIsIm1pblVwdGltZSIsIm1heFJlc3RhcnRzIiwiYXJncyIsIl9zdGFydCIsImFwcHMiLCJnZXRSdW5uaW5nSW5mbyIsImRlc2NyaWJlIiwiZGVzY3JpcHRpb25zIiwic3RhdHVzIiwibGVuZ3RoIiwicG0yX2VudiIsIl9zdG9wIiwiY29uZmlnIiwiY29uZiIsImlzUnVubmluZyIsIm1lc3NhZ2UiLCJjYXRjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OFFBQUE7Ozs7Ozs7O1FBNktnQkEsSyxHQUFBQSxLO1FBU0FDLEksR0FBQUEsSTtRQVNBQyxPLEdBQUFBLE87O0FBekxoQjs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFFQTtBQUNBLElBQU1DLE1BQU1DLFFBQVFELEdBQXBCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFTyxJQUFNRSwwQ0FBaUI7QUFDNUJDLFNBQU8sZUFBS0MsSUFBTCxDQUFVQyxTQUFWLEVBQXFCLFlBQXJCLENBRHFCO0FBRTVCQyxVQUFRLGVBQUtGLElBQUwsQ0FBVUMsU0FBVixFQUFxQixhQUFyQjtBQUZvQixDQUF2Qjs7QUFLUCxJQUFN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T0FBT0EsSUFBSStCLE9BQUosS0FBZ0Isd0JBQTNCLEVBQXFEO0FBQ25ELGdCQUFNL0IsR0FBTjtBQUNEOztBQUVEaEIsWUFBSSxNQUFKO0FBQ0FlO0FBQ0QsT0FQRDtBQVFELEtBVE0sQ0FBUDtBQVVELEdBekJNLEVBMEJKSSxJQTFCSSxDQTBCQztBQUFBLFdBQU1OLFlBQU47QUFBQSxHQTFCRCxDQUFQO0FBMkJEOztBQUVEOzs7OztBQUtPLFNBQVNoQixLQUFULEdBQXdCO0FBQzdCLFNBQU9zQyxtQ0FBZ0JhLEtBQWhCLENBQXNCOUIsV0FBdEIsQ0FBUDtBQUNEOztBQUVEOzs7OztBQUtPLFNBQVNwQixJQUFULEdBQXVCO0FBQzVCLFNBQU82QyxrQ0FBZUssS0FBZixDQUFxQjlCLFdBQXJCLENBQVA7QUFDRDs7QUFFRDs7Ozs7QUFLTyxTQUFTbkIsT0FBVCxHQUEwQjtBQUFBLG9DQUFObUMsSUFBTTtBQUFOQSxRQUFNO0FBQUE7O0FBQy9CLFNBQU9TLHVCQUFTVCxJQUFULEVBQWVmLElBQWYsQ0FBb0I7QUFBQSxXQUFNZ0Isd0JBQVVELElBQVYsQ0FBTjtBQUFBLEdBQXBCLEVBQTJDYyxLQUEzQyxDQUFpRDlCLFdBQWpELENBQVA7QUFDRDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoicG0uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERhZW1vbiBzcyBwcm9jZXNzZXMuXG4gKiAxLiBzdGFydCwgc3RvcCwgcmVzdGFydFxuICogMi4ga25vdyB0aGUgcHJldmlvdXMgcHJvY2VzcyBydW5uaW5nIHN0YXR1c1xuICogMy4gbG9nIGFuZCBsb2dyb3RhdGVcbiAqL1xuaW1wb3J0IHBtMiBmcm9tICdwbTInO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBnZXRGaWxlTmFtZSB9IGZyb20gJy4vcGlkJztcbmltcG9ydCB7IHN0cmluZ2lmeVByb3h5T3B0aW9ucyB9IGZyb20gJy4vY29uZmlnJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG5jb25zdCBsb2cgPSBjb25zb2xlLmxvZ1xuXG4vLyBjb25zdCBMT0dfUk9UQVRFX09QVElPTlMgPSB7XG4vLyAgIG1heFNpemU6ICcxS0InLFxuLy8gICByZXRhaW46IDcsXG4vLyAgIHdvcmtlckludGVydmFsOiA2MCxcbi8vICAgcm90YXRlSW50ZXJ2YWw6ICcqLzEgKiAqICogKicsXG4vLyB9O1xuXG5leHBvcnQgY29uc3QgRk9SS19GSUxFX1BBVEggPSB7XG4gIGxvY2FsOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnc3NMb2NhbC5qcycpLFxuICBzZXJ2ZXI6IHBhdGguam9pbihfX2Rpcm5hbWUsICdzc1NlcnZlci5qcycpLFxufTtcblxuY29uc3QgcG0yUHJvY2Vzc05hbWUgPSB7XG4gIGxvY2FsOiAnc3NMb2NhbCcsXG4gIHNlcnZlcjogJ3NzU2VydmVyJyxcbn07XG5cbmZ1bmN0aW9uIGdldEFyZ3MoZXh0cmFsUHJveHlPcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgZXh0cmFsUHJveHlPcHRpb25zID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBleHRyYWxQcm94eU9wdGlvbnM7XG4gIH1cblxuICAvLyBUT0RPOiBzdXBwb3J0IFwic3RyaW5naWZ5XCJcbiAgaWYgKHR5cGVvZiBleHRyYWxQcm94eU9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHN0cmluZ2lmeVByb3h5T3B0aW9ucyhleHRyYWxQcm94eU9wdGlvbnMpO1xuICB9XG5cbiAgcmV0dXJuIHByb2Nlc3MuYXJndi5zbGljZSgyKS5qb2luKCcgJyk7XG59XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3QoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIHBtMi5kaXNjb25uZWN0KChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuXG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb25uZWN0KCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBwbTIuY29ubmVjdCgoZXJyKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlRXJyb3IoZXJyKSB7XG4gIHJldHVybiBkaXNjb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAgLy8gVE9ETzpcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICBjb25zb2xlLmVycm9yKGVycik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRQTTJDb25maWcodHlwZSwgZXh0cmFsUHJveHlPcHRpb25zKSB7XG4gIHJldHVybiBjb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAgY29uc3QgZmlsZVBhdGggPSBGT1JLX0ZJTEVfUEFUSFt0eXBlXTtcbiAgICBjb25zdCBwaWRGaWxlTmFtZSA9IGdldEZpbGVOYW1lKHR5cGUpO1xuICAgIGNvbnN0IG5hbWUgPSBwbTJQcm9jZXNzTmFtZVt0eXBlXTtcblxuICAgIGNvbnN0IHBtMkNvbmZpZyA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBzY3JpcHQ6IGZpbGVQYXRoLFxuICAgICAgZXhlY19tb2RlOiAnZm9yaycsXG4gICAgICBpbnN0YW5jZXM6IDEsXG4gICAgICBvdXRwdXQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGAuLi9sb2dzLyR7bmFtZX0ubG9nYCksXG4gICAgICBlcnJvcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgYC4uL2xvZ3MvJHtuYW1lfS5lcnJgKSxcbiAgICAgIHBpZDogcGlkRmlsZU5hbWUsXG4gICAgICBtaW5VcHRpbWU6IDIwMDAsXG4gICAgICBtYXhSZXN0YXJ0czogMyxcbiAgICAgIGFyZ3M6IGdldEFyZ3MoZXh0cmFsUHJveHlPcHRpb25zKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBtMkNvbmZpZyxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gX3N0YXJ0KHR5cGUsIGV4dHJhbFByb3h5T3B0aW9ucykge1xuICByZXR1cm4gZ2V0UE0yQ29uZmlnKHR5cGUsIGV4dHJhbFByb3h5T3B0aW9ucylcbiAgICAudGhlbigoeyBwbTJDb25maWcgfSkgPT4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIHBtMi5zdGFydChwbTJDb25maWcsIChlcnIsIGFwcHMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZygnc3RhcnQnKTtcbiAgICAgICAgcmVzb2x2ZShhcHBzKTtcbiAgICAgIH0pO1xuICAgIH0pKVxuICAgIC50aGVuKCgpID0+IGRpc2Nvbm5lY3QoKSk7XG59XG5cbmZ1bmN0aW9uIGdldFJ1bm5pbmdJbmZvKG5hbWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgcG0yLmRlc2NyaWJlKG5hbWUsIChlcnIsIGRlc2NyaXB0aW9ucykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE86IHRoZXJlIHNob3VsZCBub3QgYmUgbW9yZSB0aGFuIG9uZSBwcm9jZXNzXG4gICAgICAvLyAg4oCcb25saW5l4oCdLCDigJxzdG9wcGluZ+KAnSxcbiAgICAgIC8vICDigJxzdG9wcGVk4oCdLCDigJxsYXVuY2hpbmfigJ0sXG4gICAgICAvLyAg4oCcZXJyb3JlZOKAnSwgb3Ig4oCcb25lLWxhdW5jaC1zdGF0dXPigJ1cbiAgICAgIGNvbnN0IHN0YXR1cyA9IGRlc2NyaXB0aW9ucy5sZW5ndGggPiAwXG4gICAgICAgICYmIGRlc2NyaXB0aW9uc1swXS5wbTJfZW52LnN0YXR1cyAhPT0gJ3N0b3BwZWQnXG4gICAgICAgICYmIGRlc2NyaXB0aW9uc1swXS5wbTJfZW52LnN0YXR1cyAhPT0gJ2Vycm9yZWQnO1xuXG4gICAgICByZXNvbHZlKHN0YXR1cyk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBfc3RvcCh0eXBlLCBleHRyYWxQcm94eU9wdGlvbnMpIHtcbiAgbGV0IGNvbmZpZyA9IG51bGw7XG5cbiAgcmV0dXJuIGdldFBNMkNvbmZpZyh0eXBlLCBleHRyYWxQcm94eU9wdGlvbnMpXG4gIC50aGVuKChjb25mKSA9PiB7XG4gICAgY29uZmlnID0gY29uZjtcbiAgICBjb25zdCB7IG5hbWUgfSA9IGNvbmZpZy5wbTJDb25maWc7XG4gICAgcmV0dXJuIGdldFJ1bm5pbmdJbmZvKG5hbWUpO1xuICB9KS50aGVuKChpc1J1bm5pbmcpID0+IHtcbiAgICBjb25zdCB7IHBtMkNvbmZpZyB9ID0gY29uZmlnO1xuICAgIGNvbnN0IHsgbmFtZSB9ID0gcG0yQ29uZmlnO1xuXG4gICAgaWYgKCFpc1J1bm5pbmcpIHtcbiAgICAgIGxvZygnYWxyZWFkeSBzdG9wcGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICBwbTIuc3RvcChuYW1lLCAoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIgJiYgZXJyLm1lc3NhZ2UgIT09ICdwcm9jZXNzIG5hbWUgbm90IGZvdW5kJykge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZygnc3RvcCcpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSlcbiAgICAudGhlbigoKSA9PiBkaXNjb25uZWN0KCkpO1xufVxuXG4vKipcbiAqIEBwdWJsaWNcbiAqIEBwYXJhbSAge1t0eXBlXX0gYXJncyBbZGVzY3JpcHRpb25dXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgW2Rlc2NyaXB0aW9uXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoLi4uYXJncykge1xuICByZXR1cm4gX3N0YXJ0KC4uLmFyZ3MpLmNhdGNoKGhhbmRsZUVycm9yKTtcbn1cblxuLyoqXG4gKiBAcHVibGljXG4gKiBAcGFyYW0gIHtbdHlwZV19IGFyZ3MgW2Rlc2NyaXB0aW9uXVxuICogQHJldHVybiB7W3R5cGVdfSAgICAgIFtkZXNjcmlwdGlvbl1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoLi4uYXJncykge1xuICByZXR1cm4gX3N0b3AoLi4uYXJncykuY2F0Y2goaGFuZGxlRXJyb3IpO1xufVxuXG4vKipcbiAqIEBwdWJsaWNcbiAqIEBwYXJhbSAge1t0eXBlXX0gYXJncyBbZGVzY3JpcHRpb25dXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgW2Rlc2NyaXB0aW9uXVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdGFydCguLi5hcmdzKSB7XG4gIHJldHVybiBfc3RvcCguLi5hcmdzKS50aGVuKCgpID0+IF9zdGFydCguLi5hcmdzKSkuY2F0Y2goaGFuZGxlRXJyb3IpO1xufVxuXG4vLyBpZiAobW9kdWxlID09PSByZXF1aXJlLm1haW4pIHtcbi8vICAgcmVzdGFydCgnbG9jYWwnLCB7XG4vLyAgICAgcGFzc3dvcmQ6ICdob2xpYzEyMycsXG4vLyAgICAgc2VydmVyQWRkcjogJ2tyLm95eWQubmV0Jyxcbi8vICAgfSk7XG4vLyB9XG4iXX0=