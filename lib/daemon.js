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
  var type = process.argv[2];
  var argv = process.argv.slice(3);

  (0, _cli.getConfig)(argv, function (err, config) {
    var proxyOptions = config.proxyOptions;
    // eslint-disable-next-line

    var shouldRecordServerMemory = proxyOptions['_recordMemoryUsage'] && type === 'server';

    logger = (0, _logger.createLogger)(proxyOptions.level, null,
    // LOG_NAMES.DAEMON,
    false);

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
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9kYWVtb24uanMiXSwibmFtZXMiOlsiTkFNRSIsIk1BWF9SRVNUQVJUX1RJTUUiLCJjaGlsZCIsImxvZ2dlciIsInNob3VsZFN0b3AiLCJGT1JLX0ZJTEVfUEFUSCIsImxvY2FsIiwiX19kaXJuYW1lIiwic2VydmVyIiwiZGFlbW9uIiwidHlwZSIsImNvbmZpZyIsImZpbGVQYXRoIiwic2hvdWxkUmVjb3JkU2VydmVyTWVtb3J5IiwiX3Jlc3RhcnRUaW1lIiwicmVzdGFydFRpbWUiLCJvbiIsInNlbmQiLCJzZXRUaW1lb3V0Iiwid2FybiIsImVycm9yIiwicHJvY2VzcyIsImV4aXQiLCJtb2R1bGUiLCJyZXF1aXJlIiwibWFpbiIsImFyZ3YiLCJzbGljZSIsImVyciIsInByb3h5T3B0aW9ucyIsImxldmVsIiwibWVzc2FnZSIsInVuY2F1Z2h0RXJyIiwic3RhY2siXSwibWFwcGluZ3MiOiI7Ozs7O0FBU0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBRUEsSUFBTUEsT0FBTyxRQUFiO0FBQ0E7QUFDQTtBQW5CQTs7Ozs7Ozs7O0FBb0JBLElBQU1DLG1CQUFtQixDQUF6Qjs7QUFFQSxJQUFJQyxRQUFRLElBQVo7QUFDQSxJQUFJQyxlQUFKO0FBQ0EsSUFBSUMsYUFBYSxLQUFqQjs7QUFFQTtBQUNPLElBQU1DLDBDQUFpQjtBQUM1QkMsU0FBTyxnQkFBS0MsU0FBTCxFQUFnQixTQUFoQixDQURxQjtBQUU1QkMsVUFBUSxnQkFBS0QsU0FBTCxFQUFnQixVQUFoQjtBQUZvQixDQUF2Qjs7QUFLUCxTQUFTRSxNQUFULENBQWdCQyxJQUFoQixFQUFzQkMsTUFBdEIsRUFBOEJDLFFBQTlCLEVBQXdDQyx3QkFBeEMsRUFBa0VDLFlBQWxFLEVBQWdGO0FBQzlFLE1BQUlDLGNBQWNELGdCQUFnQixDQUFsQzs7QUFFQVosVUFBUSx5QkFBS1UsUUFBTCxDQUFSOztBQUVBLE1BQUlDLHdCQUFKLEVBQThCO0FBQzVCWCxVQUFNYyxFQUFOLENBQVMsU0FBVDtBQUNEOztBQUVEZCxRQUFNZSxJQUFOLENBQVdOLE1BQVg7O0FBRUFPLGFBQVcsWUFBTTtBQUNmSCxrQkFBYyxDQUFkO0FBQ0QsR0FGRCxFQUVHLEtBQUssSUFGUjs7QUFJQWIsUUFBTWMsRUFBTixDQUFTLE1BQVQsRUFBaUIsWUFBTTtBQUNyQixRQUFJWixVQUFKLEVBQWdCO0FBQ2Q7QUFDRDs7QUFFREQsV0FBT2dCLElBQVAsQ0FBZW5CLElBQWY7O0FBRUEsZ0NBQWdCRSxLQUFoQixFQUF1QixTQUF2Qjs7QUFFQSxRQUFJYSxjQUFjZCxnQkFBbEIsRUFBb0M7QUFDbENRLGFBQU9DLElBQVAsRUFBYUMsTUFBYixFQUFxQkMsUUFBckIsRUFBK0JDLHdCQUEvQixFQUF5REUsY0FBYyxDQUF2RTtBQUNELEtBRkQsTUFFTztBQUNMWixhQUFPaUIsS0FBUCxDQUNLcEIsSUFETCw4Q0FFRSxtQ0FBdUJHLE1BQXZCLEVBQStCLFlBQU07QUFDbkMsZ0NBQWNPLElBQWQ7QUFDQVcsZ0JBQVFDLElBQVIsQ0FBYSxDQUFiO0FBQ0QsT0FIRCxDQUZGO0FBT0Q7QUFDRixHQXBCRDtBQXFCRDs7QUFFRCxJQUFJQyxXQUFXQyxRQUFRQyxJQUF2QixFQUE2QjtBQUMzQixNQUFNZixPQUFPVyxRQUFRSyxJQUFSLENBQWEsQ0FBYixDQUFiO0FBQ0EsTUFBTUEsT0FBT0wsUUFBUUssSUFBUixDQUFhQyxLQUFiLENBQW1CLENBQW5CLENBQWI7O0FBRUEsc0JBQVVELElBQVYsRUFBZ0IsVUFBQ0UsR0FBRCxFQUFNakIsTUFBTixFQUFpQjtBQUFBLFFBQ3ZCa0IsWUFEdUIsR0FDTmxCLE1BRE0sQ0FDdkJrQixZQUR1QjtBQUUvQjs7QUFDQSxRQUFNaEIsMkJBQTJCZ0IsYUFBYSxvQkFBYixLQUFzQ25CLFNBQVMsUUFBaEY7O0FBRUFQLGFBQVMsMEJBQ1AwQixhQUFhQyxLQUROLEVBRVAsSUFGTztBQUdQO0FBQ0EsU0FKTyxDQUFUOztBQU9BLFFBQUlGLEdBQUosRUFBUztBQUNQekIsYUFBT2lCLEtBQVAsQ0FBZ0JwQixJQUFoQixVQUF5QjRCLElBQUlHLE9BQTdCO0FBQ0Q7O0FBRUR0QixXQUFPQyxJQUFQLEVBQWFtQixZQUFiLEVBQTJCeEIsZUFBZUssSUFBZixDQUEzQixFQUFpREcsd0JBQWpEOztBQUVBUSxZQUFRTCxFQUFSLENBQVcsUUFBWCxFQUFxQixZQUFNO0FBQ3pCWixtQkFBYSxJQUFiOztBQUVBLFVBQUlGLEtBQUosRUFBVztBQUNULG9DQUFnQkEsS0FBaEIsRUFBdUIsU0FBdkI7QUFDRDs7QUFFRCw4QkFBY1EsSUFBZDs7QUFFQSxVQUFJRyx3QkFBSixFQUE4QjtBQUM1QjtBQUNEOztBQUVEUSxjQUFRQyxJQUFSLENBQWEsQ0FBYjtBQUNELEtBZEQ7O0FBZ0JBRCxZQUFRTCxFQUFSLENBQVcsbUJBQVgsRUFBZ0MsVUFBQ2dCLFdBQUQsRUFBaUI7QUFDL0M3QixhQUFPaUIsS0FBUCxDQUFnQnBCLElBQWhCLHFCQUFvQ2dDLFlBQVlDLEtBQWhELEVBQ0UsbUNBQXVCOUIsTUFBdkIsRUFBK0IsWUFBTTtBQUNuQ2tCLGdCQUFRQyxJQUFSLENBQWEsQ0FBYjtBQUNELE9BRkQsQ0FERjtBQUlELEtBTEQ7QUFNRCxHQXhDRDtBQXlDRCIsImZpbGUiOiJkYWVtb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIGBgYFxuICogJCBub2RlIGxpYi9kYWVtb24gbG9jYWwgLWQgcmVzdGFydFxuICogYGBgXG4gKlxuICogYGBgXG4gKiAkIG5vZGUgbGliL2RhZW1vbiBzZXJ2ZXIgLWQgcmVzdGFydCAtayBhYmNcbiAqIGBgYFxuICovXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmb3JrIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyBnZXRDb25maWcgfSBmcm9tICcuL2NsaSc7XG5pbXBvcnQgeyBkZWxldGVQaWRGaWxlIH0gZnJvbSAnLi9waWQnO1xuaW1wb3J0IHsgcmVjb3JkLCBzdG9wUmVjb3JkIH0gZnJvbSAnLi9yZWNvcmRNZW1vcnlVc2FnZSc7XG5pbXBvcnQgeyBjcmVhdGVTYWZlQWZ0ZXJIYW5kbGVyLCBzYWZlbHlLaWxsQ2hpbGQgfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgTkFNRSA9ICdkYWVtb24nO1xuLy8gVE9ETzpcbi8vIGNvbnN0IE1BWF9SRVNUQVJUX1RJTUUgPSA1O1xuY29uc3QgTUFYX1JFU1RBUlRfVElNRSA9IDE7XG5cbmxldCBjaGlsZCA9IG51bGw7XG5sZXQgbG9nZ2VyO1xubGV0IHNob3VsZFN0b3AgPSBmYWxzZTtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG5leHBvcnQgY29uc3QgRk9SS19GSUxFX1BBVEggPSB7XG4gIGxvY2FsOiBqb2luKF9fZGlybmFtZSwgJ3NzTG9jYWwnKSxcbiAgc2VydmVyOiBqb2luKF9fZGlybmFtZSwgJ3NzU2VydmVyJyksXG59O1xuXG5mdW5jdGlvbiBkYWVtb24odHlwZSwgY29uZmlnLCBmaWxlUGF0aCwgc2hvdWxkUmVjb3JkU2VydmVyTWVtb3J5LCBfcmVzdGFydFRpbWUpIHtcbiAgbGV0IHJlc3RhcnRUaW1lID0gX3Jlc3RhcnRUaW1lIHx8IDA7XG5cbiAgY2hpbGQgPSBmb3JrKGZpbGVQYXRoKTtcblxuICBpZiAoc2hvdWxkUmVjb3JkU2VydmVyTWVtb3J5KSB7XG4gICAgY2hpbGQub24oJ21lc3NhZ2UnLCByZWNvcmQpO1xuICB9XG5cbiAgY2hpbGQuc2VuZChjb25maWcpO1xuXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHJlc3RhcnRUaW1lID0gMDtcbiAgfSwgNjAgKiAxMDAwKTtcblxuICBjaGlsZC5vbignZXhpdCcsICgpID0+IHtcbiAgICBpZiAoc2hvdWxkU3RvcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZ2dlci53YXJuKGAke05BTUV9OiBwcm9jZXNzIGV4aXQuYCk7XG5cbiAgICBzYWZlbHlLaWxsQ2hpbGQoY2hpbGQsICdTSUdLSUxMJyk7XG5cbiAgICBpZiAocmVzdGFydFRpbWUgPCBNQVhfUkVTVEFSVF9USU1FKSB7XG4gICAgICBkYWVtb24odHlwZSwgY29uZmlnLCBmaWxlUGF0aCwgc2hvdWxkUmVjb3JkU2VydmVyTWVtb3J5LCByZXN0YXJ0VGltZSArIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgIGAke05BTUV9OiByZXN0YXJ0ZWQgdG9vIG1hbnkgdGltZXMsIHdpbGwgY2xvc2UuYCxcbiAgICAgICAgY3JlYXRlU2FmZUFmdGVySGFuZGxlcihsb2dnZXIsICgpID0+IHtcbiAgICAgICAgICBkZWxldGVQaWRGaWxlKHR5cGUpO1xuICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICB9KTtcbn1cblxuaWYgKG1vZHVsZSA9PT0gcmVxdWlyZS5tYWluKSB7XG4gIGNvbnN0IHR5cGUgPSBwcm9jZXNzLmFyZ3ZbMl07XG4gIGNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMyk7XG5cbiAgZ2V0Q29uZmlnKGFyZ3YsIChlcnIsIGNvbmZpZykgPT4ge1xuICAgIGNvbnN0IHsgcHJveHlPcHRpb25zIH0gPSBjb25maWc7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gICAgY29uc3Qgc2hvdWxkUmVjb3JkU2VydmVyTWVtb3J5ID0gcHJveHlPcHRpb25zWydfcmVjb3JkTWVtb3J5VXNhZ2UnXSAmJiB0eXBlID09PSAnc2VydmVyJztcblxuICAgIGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcihcbiAgICAgIHByb3h5T3B0aW9ucy5sZXZlbCxcbiAgICAgIG51bGwsXG4gICAgICAvLyBMT0dfTkFNRVMuREFFTU9OLFxuICAgICAgZmFsc2VcbiAgICApO1xuXG4gICAgaWYgKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGAke05BTUV9OiAke2Vyci5tZXNzYWdlfWApO1xuICAgIH1cblxuICAgIGRhZW1vbih0eXBlLCBwcm94eU9wdGlvbnMsIEZPUktfRklMRV9QQVRIW3R5cGVdLCBzaG91bGRSZWNvcmRTZXJ2ZXJNZW1vcnkpO1xuXG4gICAgcHJvY2Vzcy5vbignU0lHSFVQJywgKCkgPT4ge1xuICAgICAgc2hvdWxkU3RvcCA9IHRydWU7XG5cbiAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICBzYWZlbHlLaWxsQ2hpbGQoY2hpbGQsICdTSUdLSUxMJyk7XG4gICAgICB9XG5cbiAgICAgIGRlbGV0ZVBpZEZpbGUodHlwZSk7XG5cbiAgICAgIGlmIChzaG91bGRSZWNvcmRTZXJ2ZXJNZW1vcnkpIHtcbiAgICAgICAgc3RvcFJlY29yZCgpO1xuICAgICAgfVxuXG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgfSk7XG5cbiAgICBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsICh1bmNhdWdodEVycikgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKGAke05BTUV9IGdldCBlcnJvcjpcXG4ke3VuY2F1Z2h0RXJyLnN0YWNrfWAsXG4gICAgICAgIGNyZWF0ZVNhZmVBZnRlckhhbmRsZXIobG9nZ2VyLCAoKSA9PiB7XG4gICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICB9KSk7XG4gICAgfSk7XG4gIH0pO1xufVxuIl19