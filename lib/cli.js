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
  '\n' + (invalidOption ? invalidOption + '\n' : '') + 'shadowsocks-js ' + _package.version + '\nYou can supply configurations via either config file or command line arguments.\n\nProxy options:\n  -c CONFIG_FILE                Path to the config file.\n  -s SERVER_ADDR                Server address. default: 0.0.0.0\n  -p SERVER_PORT                Server port. default: 8083\n  -l LOCAL_ADDR                 Local binding address. default: 127.0.0.1\n  -b LOCAL_PORT                 Local port. default: 1080\n  -k PASSWORD                   Password.\n  -m METHOD                     Encryption method. default: aes-128-cfb\n  -t TIMEOUT                    Timeout in seconds. default: 600\n  --pac_port PAC_PORT           PAC file server port. default: 8090\n  --pac_update_gfwlist [URL]    [localssjs] Update the gfwlist\n                                for PAC server. You can specify the\n                                request URL.\n  --log_path LOG_PATH           The directory path to log. Won\'t if not set.\n  --level LOG_LEVEL             Log level. default: warn\n                                example: --level verbose\nGeneral options:\n  -h, --help                    Show this help message and exit.\n  -d start/stop/restart         Run as a daemon.\n');
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