'use strict';

exports.__esModule = true;
exports.default = client;

var _package = require('../package.json');

var _ssLocal = require('./ssLocal');

var ssLocal = _interopRequireWildcard(_ssLocal);

var _ssServer = require('./ssServer');

var ssServer = _interopRequireWildcard(_ssServer);

var _gfwlistUtils = require('./gfwlistUtils');

var _config = require('./config');

var _pm = require('./pm');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var log = console.log; // eslint-disable-line

function getDaemonType(isServer) {
  return isServer ? 'server' : 'local';
}

function logHelp(invalidOption) {
  log(
  // eslint-disable-next-line
  '\n' + (invalidOption ? invalidOption + '\n' : '') + 'encryptsocks ' + _package.version + '\nYou can supply configurations via either config file or command line arguments.\n\nProxy options:\n  -c CONFIG_FILE                Path to the config file.\n  -s SERVER_ADDR                Server address. default: 0.0.0.0\n  -p SERVER_PORT                Server port. default: 8083\n  -l LOCAL_ADDR                 Local binding address. default: 127.0.0.1\n  -b LOCAL_PORT                 Local port. default: 1080\n  -k PASSWORD                   Password.\n  -m METHOD                     Encryption method. default: aes-128-cfb\n  -t TIMEOUT                    Timeout in seconds. default: 600\n  --pac_port PAC_PORT           PAC file server port. default: 8090\n  --pac_update_gfwlist [URL]    [localssjs] Update the gfwlist\n                                for PAC server. You can specify the\n                                request URL.\n  --log_path LOG_PATH           The directory path to log. Won\'t if not set.\n  --level LOG_LEVEL             Log level. default: warn\n                                example: --level verbose\nGeneral options:\n  -h, --help                    Show this help message and exit.\n  -d start/stop/restart         Run as a daemon.\n');
}

function updateGFWList(flag) {
  log('Updating gfwlist...');

  var next = function next(err) {
    if (err) {
      throw err;
    } else {
      log('Updating finished. You can checkout the file here: ' + _gfwlistUtils.GFWLIST_FILE_PATH);
    }
  };

  if (typeof flag === 'string') {
    (0, _gfwlistUtils.updateGFWList)(flag, next);
  } else {
    (0, _gfwlistUtils.updateGFWList)(next);
  }
}

function runDaemon(isServer, cmd) {
  var type = getDaemonType(isServer);

  switch (cmd) {
    case _config.DAEMON_COMMAND.start:
      {
        (0, _pm.start)(type);
        return;
      }
    case _config.DAEMON_COMMAND.stop:
      {
        (0, _pm.stop)(type);
        return;
      }
    case _config.DAEMON_COMMAND.restart:
      {
        (0, _pm.restart)(type);
        break;
      }
    default:
  }
}

function runSingle(isServer, proxyOptions) {
  var willLogToConsole = true;
  return isServer ? ssServer.startServer(proxyOptions, willLogToConsole) : ssLocal.startServer(proxyOptions, willLogToConsole);
}

function client(isServer) {
  var argv = process.argv.slice(2);

  (0, _config.getConfig)(argv, function (err, config) {
    if (err) {
      throw err;
    }

    var generalOptions = config.generalOptions,
        proxyOptions = config.proxyOptions,
        invalidOption = config.invalidOption;


    if (generalOptions.help || invalidOption) {
      logHelp(invalidOption);
    } else if (generalOptions.pacUpdateGFWList) {
      updateGFWList(generalOptions.pacUpdateGFWList);
    } else if (generalOptions.daemon) {
      runDaemon(isServer, generalOptions.daemon);
    } else {
      runSingle(isServer, proxyOptions);
    }
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGkuanMiXSwibmFtZXMiOlsiY2xpZW50Iiwic3NMb2NhbCIsInNzU2VydmVyIiwibG9nIiwiY29uc29sZSIsImdldERhZW1vblR5cGUiLCJpc1NlcnZlciIsImxvZ0hlbHAiLCJpbnZhbGlkT3B0aW9uIiwidXBkYXRlR0ZXTGlzdCIsImZsYWciLCJuZXh0IiwiZXJyIiwicnVuRGFlbW9uIiwiY21kIiwidHlwZSIsInN0YXJ0Iiwic3RvcCIsInJlc3RhcnQiLCJydW5TaW5nbGUiLCJwcm94eU9wdGlvbnMiLCJ3aWxsTG9nVG9Db25zb2xlIiwic3RhcnRTZXJ2ZXIiLCJhcmd2IiwicHJvY2VzcyIsInNsaWNlIiwiY29uZmlnIiwiZ2VuZXJhbE9wdGlvbnMiLCJoZWxwIiwicGFjVXBkYXRlR0ZXTGlzdCIsImRhZW1vbiJdLCJtYXBwaW5ncyI6Ijs7O2tCQXVGd0JBLE07O0FBdkZ4Qjs7QUFDQTs7SUFBWUMsTzs7QUFDWjs7SUFBWUMsUTs7QUFDWjs7QUFDQTs7QUFDQTs7OztBQUVBLElBQU1DLE1BQU1DLFFBQVFELEdBQXBCLEMsQ0FBeUI7O0FBRXpCLFNBQVNFLGFBQVQsQ0FBdUJDLFFBQXZCLEVBQWlDO0FBQy9CLFNBQU9BLFdBQVcsUUFBWCxHQUFzQixPQUE3QjtBQUNEOztBQUVELFNBQVNDLE9BQVQsQ0FBaUJDLGFBQWpCLEVBQWdDO0FBQzlCTDtBQUNGO0FBREUsVUFHQ0ssZ0JBQW1CQSxhQUFuQixVQUF1QyxFQUh4QztBQTJCRDs7QUFFRCxTQUFTQyxhQUFULENBQXVCQyxJQUF2QixFQUE2QjtBQUMzQlAsTUFBSSxxQkFBSjs7QUFFQSxNQUFNUSxPQUFPLFNBQVBBLElBQU8sQ0FBQ0MsR0FBRCxFQUFTO0FBQ3BCLFFBQUlBLEdBQUosRUFBUztBQUNQLFlBQU1BLEdBQU47QUFDRCxLQUZELE1BRU87QUFDTFQ7QUFDRDtBQUNGLEdBTkQ7O0FBUUEsTUFBSSxPQUFPTyxJQUFQLEtBQWdCLFFBQXBCLEVBQThCO0FBQzVCLHFDQUFlQSxJQUFmLEVBQXFCQyxJQUFyQjtBQUNELEdBRkQsTUFFTztBQUNMLHFDQUFlQSxJQUFmO0FBQ0Q7QUFDRjs7QUFFRCxTQUFTRSxTQUFULENBQW1CUCxRQUFuQixFQUE2QlEsR0FBN0IsRUFBa0M7QUFDaEMsTUFBTUMsT0FBT1YsY0FBY0MsUUFBZCxDQUFiOztBQUVBLFVBQVFRLEdBQVI7QUFDRSxTQUFLLHVCQUFlRSxLQUFwQjtBQUEyQjtBQUN6Qix1QkFBTUQsSUFBTjtBQUNBO0FBQ0Q7QUFDRCxTQUFLLHVCQUFlRSxJQUFwQjtBQUEwQjtBQUN4QixzQkFBS0YsSUFBTDtBQUNBO0FBQ0Q7QUFDRCxTQUFLLHVCQUFlRyxPQUFwQjtBQUE2QjtBQUMzQix5QkFBUUgsSUFBUjtBQUNBO0FBQ0Q7QUFDRDtBQWJGO0FBZUQ7O0FBRUQsU0FBU0ksU0FBVCxDQUFtQmIsUUFBbkIsRUFBNkJjLFlBQTdCLEVBQTJDO0FBQ3pDLE1BQU1DLG1CQUFtQixJQUF6QjtBQUNBLFNBQU9mLFdBQVdKLFNBQVNvQixXQUFULENBQXFCRixZQUFyQixFQUFtQ0MsZ0JBQW5DLENBQVgsR0FDSHBCLFFBQVFxQixXQUFSLENBQW9CRixZQUFwQixFQUFrQ0MsZ0JBQWxDLENBREo7QUFFRDs7QUFFYyxTQUFTckIsTUFBVCxDQUFnQk0sUUFBaEIsRUFBMEI7QUFDdkMsTUFBTWlCLE9BQU9DLFFBQVFELElBQVIsQ0FBYUUsS0FBYixDQUFtQixDQUFuQixDQUFiOztBQUVBLHlCQUFVRixJQUFWLEVBQWdCLFVBQUNYLEdBQUQsRUFBTWMsTUFBTixFQUFpQjtBQUMvQixRQUFJZCxHQUFKLEVBQVM7QUFDUCxZQUFNQSxHQUFOO0FBQ0Q7O0FBSDhCLFFBS3ZCZSxjQUx1QixHQUt5QkQsTUFMekIsQ0FLdkJDLGNBTHVCO0FBQUEsUUFLUFAsWUFMTyxHQUt5Qk0sTUFMekIsQ0FLUE4sWUFMTztBQUFBLFFBS09aLGFBTFAsR0FLeUJrQixNQUx6QixDQUtPbEIsYUFMUDs7O0FBTy9CLFFBQUltQixlQUFlQyxJQUFmLElBQXVCcEIsYUFBM0IsRUFBMEM7QUFDeENELGNBQVFDLGFBQVI7QUFDRCxLQUZELE1BRU8sSUFBSW1CLGVBQWVFLGdCQUFuQixFQUFxQztBQUMxQ3BCLG9CQUFja0IsZUFBZUUsZ0JBQTdCO0FBQ0QsS0FGTSxNQUVBLElBQUlGLGVBQWVHLE1BQW5CLEVBQTJCO0FBQ2hDakIsZ0JBQVVQLFFBQVYsRUFBb0JxQixlQUFlRyxNQUFuQztBQUNELEtBRk0sTUFFQTtBQUNMWCxnQkFBVWIsUUFBVixFQUFvQmMsWUFBcEI7QUFDRDtBQUNGLEdBaEJEO0FBaUJEIiwiZmlsZSI6ImNsaS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHZlcnNpb24gfSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0ICogYXMgc3NMb2NhbCBmcm9tICcuL3NzTG9jYWwnO1xuaW1wb3J0ICogYXMgc3NTZXJ2ZXIgZnJvbSAnLi9zc1NlcnZlcic7XG5pbXBvcnQgeyB1cGRhdGVHRldMaXN0IGFzIF91cGRhdGVHRldMaXN0LCBHRldMSVNUX0ZJTEVfUEFUSCB9IGZyb20gJy4vZ2Z3bGlzdFV0aWxzJztcbmltcG9ydCB7IGdldENvbmZpZywgREFFTU9OX0NPTU1BTkQgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBzdGFydCwgc3RvcCwgcmVzdGFydCB9IGZyb20gJy4vcG0nO1xuXG5jb25zdCBsb2cgPSBjb25zb2xlLmxvZzsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuXG5mdW5jdGlvbiBnZXREYWVtb25UeXBlKGlzU2VydmVyKSB7XG4gIHJldHVybiBpc1NlcnZlciA/ICdzZXJ2ZXInIDogJ2xvY2FsJztcbn1cblxuZnVuY3Rpb24gbG9nSGVscChpbnZhbGlkT3B0aW9uKSB7XG4gIGxvZyhcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuYFxuJHsoaW52YWxpZE9wdGlvbiA/IGAke2ludmFsaWRPcHRpb259XFxuYCA6ICcnKX1lbmNyeXB0c29ja3MgJHt2ZXJzaW9ufVxuWW91IGNhbiBzdXBwbHkgY29uZmlndXJhdGlvbnMgdmlhIGVpdGhlciBjb25maWcgZmlsZSBvciBjb21tYW5kIGxpbmUgYXJndW1lbnRzLlxuXG5Qcm94eSBvcHRpb25zOlxuICAtYyBDT05GSUdfRklMRSAgICAgICAgICAgICAgICBQYXRoIHRvIHRoZSBjb25maWcgZmlsZS5cbiAgLXMgU0VSVkVSX0FERFIgICAgICAgICAgICAgICAgU2VydmVyIGFkZHJlc3MuIGRlZmF1bHQ6IDAuMC4wLjBcbiAgLXAgU0VSVkVSX1BPUlQgICAgICAgICAgICAgICAgU2VydmVyIHBvcnQuIGRlZmF1bHQ6IDgwODNcbiAgLWwgTE9DQUxfQUREUiAgICAgICAgICAgICAgICAgTG9jYWwgYmluZGluZyBhZGRyZXNzLiBkZWZhdWx0OiAxMjcuMC4wLjFcbiAgLWIgTE9DQUxfUE9SVCAgICAgICAgICAgICAgICAgTG9jYWwgcG9ydC4gZGVmYXVsdDogMTA4MFxuICAtayBQQVNTV09SRCAgICAgICAgICAgICAgICAgICBQYXNzd29yZC5cbiAgLW0gTUVUSE9EICAgICAgICAgICAgICAgICAgICAgRW5jcnlwdGlvbiBtZXRob2QuIGRlZmF1bHQ6IGFlcy0xMjgtY2ZiXG4gIC10IFRJTUVPVVQgICAgICAgICAgICAgICAgICAgIFRpbWVvdXQgaW4gc2Vjb25kcy4gZGVmYXVsdDogNjAwXG4gIC0tcGFjX3BvcnQgUEFDX1BPUlQgICAgICAgICAgIFBBQyBmaWxlIHNlcnZlciBwb3J0LiBkZWZhdWx0OiA4MDkwXG4gIC0tcGFjX3VwZGF0ZV9nZndsaXN0IFtVUkxdICAgIFtsb2NhbHNzanNdIFVwZGF0ZSB0aGUgZ2Z3bGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgUEFDIHNlcnZlci4gWW91IGNhbiBzcGVjaWZ5IHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0IFVSTC5cbiAgLS1sb2dfcGF0aCBMT0dfUEFUSCAgICAgICAgICAgVGhlIGRpcmVjdG9yeSBwYXRoIHRvIGxvZy4gV29uJ3QgaWYgbm90IHNldC5cbiAgLS1sZXZlbCBMT0dfTEVWRUwgICAgICAgICAgICAgTG9nIGxldmVsLiBkZWZhdWx0OiB3YXJuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4YW1wbGU6IC0tbGV2ZWwgdmVyYm9zZVxuR2VuZXJhbCBvcHRpb25zOlxuICAtaCwgLS1oZWxwICAgICAgICAgICAgICAgICAgICBTaG93IHRoaXMgaGVscCBtZXNzYWdlIGFuZCBleGl0LlxuICAtZCBzdGFydC9zdG9wL3Jlc3RhcnQgICAgICAgICBSdW4gYXMgYSBkYWVtb24uXG5gXG4gICk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUdGV0xpc3QoZmxhZykge1xuICBsb2coJ1VwZGF0aW5nIGdmd2xpc3QuLi4nKTtcblxuICBjb25zdCBuZXh0ID0gKGVycikgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nKGBVcGRhdGluZyBmaW5pc2hlZC4gWW91IGNhbiBjaGVja291dCB0aGUgZmlsZSBoZXJlOiAke0dGV0xJU1RfRklMRV9QQVRIfWApO1xuICAgIH1cbiAgfTtcblxuICBpZiAodHlwZW9mIGZsYWcgPT09ICdzdHJpbmcnKSB7XG4gICAgX3VwZGF0ZUdGV0xpc3QoZmxhZywgbmV4dCk7XG4gIH0gZWxzZSB7XG4gICAgX3VwZGF0ZUdGV0xpc3QobmV4dCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuRGFlbW9uKGlzU2VydmVyLCBjbWQpIHtcbiAgY29uc3QgdHlwZSA9IGdldERhZW1vblR5cGUoaXNTZXJ2ZXIpO1xuXG4gIHN3aXRjaCAoY21kKSB7XG4gICAgY2FzZSBEQUVNT05fQ09NTUFORC5zdGFydDoge1xuICAgICAgc3RhcnQodHlwZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNhc2UgREFFTU9OX0NPTU1BTkQuc3RvcDoge1xuICAgICAgc3RvcCh0eXBlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2FzZSBEQUVNT05fQ09NTUFORC5yZXN0YXJ0OiB7XG4gICAgICByZXN0YXJ0KHR5cGUpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuU2luZ2xlKGlzU2VydmVyLCBwcm94eU9wdGlvbnMpIHtcbiAgY29uc3Qgd2lsbExvZ1RvQ29uc29sZSA9IHRydWU7XG4gIHJldHVybiBpc1NlcnZlciA/IHNzU2VydmVyLnN0YXJ0U2VydmVyKHByb3h5T3B0aW9ucywgd2lsbExvZ1RvQ29uc29sZSlcbiAgICA6IHNzTG9jYWwuc3RhcnRTZXJ2ZXIocHJveHlPcHRpb25zLCB3aWxsTG9nVG9Db25zb2xlKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY2xpZW50KGlzU2VydmVyKSB7XG4gIGNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG5cbiAgZ2V0Q29uZmlnKGFyZ3YsIChlcnIsIGNvbmZpZykgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICBjb25zdCB7IGdlbmVyYWxPcHRpb25zLCBwcm94eU9wdGlvbnMsIGludmFsaWRPcHRpb24gfSA9IGNvbmZpZztcblxuICAgIGlmIChnZW5lcmFsT3B0aW9ucy5oZWxwIHx8IGludmFsaWRPcHRpb24pIHtcbiAgICAgIGxvZ0hlbHAoaW52YWxpZE9wdGlvbik7XG4gICAgfSBlbHNlIGlmIChnZW5lcmFsT3B0aW9ucy5wYWNVcGRhdGVHRldMaXN0KSB7XG4gICAgICB1cGRhdGVHRldMaXN0KGdlbmVyYWxPcHRpb25zLnBhY1VwZGF0ZUdGV0xpc3QpO1xuICAgIH0gZWxzZSBpZiAoZ2VuZXJhbE9wdGlvbnMuZGFlbW9uKSB7XG4gICAgICBydW5EYWVtb24oaXNTZXJ2ZXIsIGdlbmVyYWxPcHRpb25zLmRhZW1vbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJ1blNpbmdsZShpc1NlcnZlciwgcHJveHlPcHRpb25zKTtcbiAgICB9XG4gIH0pO1xufVxuIl19