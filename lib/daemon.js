'use strict';

exports.__esModule = true;
exports.FORK_FILE_PATH = undefined;

var _path = require('path');

var _child_process = require('child_process');

var _logger = require('./logger');

var _cli = require('./cli');

var _pid = require('./pid');

var _recordMemoryUsage = require('./recordMemoryUsage');

var _utils = require('./utils');

var NAME = 'daemon';
// TODO:
// const MAX_RESTART_TIME = 5;
/**
 * ```
 * $ node lib/daemon local -d restart
 * ```
 *
 * ```
 * $ node lib/daemon server -d restart -k abc
 * ```
 */
var MAX_RESTART_TIME = 1;

var child = null;
var logger = void 0;
var shouldStop = false;

// eslint-disable-next-line
var FORK_FILE_PATH = exports.FORK_FILE_PATH = {
  local: (0, _path.join)(__dirname, 'ssLocal'),
  server: (0, _path.join)(__dirname, 'ssServer')
};

function daemon(type, config, filePath, shouldRecordServerMemory, _restartTime) {
  var restartTime = _restartTime || 0;

  child = (0, _child_process.fork)(filePath);

  if (shouldRecordServerMemory) {
    child.on('message', _recordMemoryUsage.record);
  }

  child.send(config);

  setTimeout(function () {
    restartTime = 0;
  }, 60 * 1000);

  child.on('exit', function () {
    if (shouldStop) {
      return;
    }

    logger.warn(NAME + ': process exit.');

    (0, _utils.safelyKillChild)(child, 'SIGKILL');

    if (restartTime < MAX_RESTART_TIME) {
      daemon(type, config, filePath, shouldRecordServerMemory, restartTime + 1);
    } else {
      logger.error(NAME + ': restarted too many times, will close.', (0, _utils.createSafeAfterHandler)(logger, function () {
        (0, _pid.deletePidFile)(type);
        process.exit(1);
      }));
    }
  });
}

if (module === require.main) {
  (function () {
    var type = process.argv[2];
    var argv = process.argv.slice(3);

    (0, _cli.getConfig)(argv, function (err, config) {
      var proxyOptions = config.proxyOptions;
      // eslint-disable-next-line

      var shouldRecordServerMemory = proxyOptions['_recordMemoryUsage'] && type === 'server';

      logger = (0, _logger.createLogger)(proxyOptions.level, _logger.LOG_NAMES.DAEMON, false);

      if (err) {
        logger.error(NAME + ': ' + err.message);
      }

      daemon(type, proxyOptions, FORK_FILE_PATH[type], shouldRecordServerMemory);

      process.on('SIGHUP', function () {
        shouldStop = true;

        if (child) {
          (0, _utils.safelyKillChild)(child, 'SIGKILL');
        }

        (0, _pid.deletePidFile)(type);

        if (shouldRecordServerMemory) {
          (0, _recordMemoryUsage.stopRecord)();
        }

        process.exit(0);
      });

      process.on('uncaughtException', function (uncaughtErr) {
        logger.error(NAME + ' get error:\n' + uncaughtErr.stack, (0, _utils.createSafeAfterHandler)(logger, function () {
          process.exit(1);
        }));
      });
    });
  })();
}