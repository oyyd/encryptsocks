'use strict';

exports.__esModule = true;
exports.default = client;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _child_process = require('child_process');

var _package = require('../package.json');

var _ssLocal = require('./ssLocal');

var ssLocal = _interopRequireWildcard(_ssLocal);

var _ssServer = require('./ssServer');

var ssServer = _interopRequireWildcard(_ssServer);

var _pid = require('./pid');

var _gfwlistUtils = require('./gfwlistUtils');

var _utils = require('./utils');

var _config = require('./config');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SPAWN_OPTIONS = {
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore', 'ipc']
};

var log = console.log; // eslint-disable-line

function getDaemonType(isServer) {
  return isServer ? 'server' : 'local';
}

function isRunning(pid) {
  try {
    // signal 0 to test existence
    return process.kill(pid, 0);
  } catch (e) {
    // NOTE: 'EPERM' permissions, 'ESRCH' process group doesn't exist
    return e.code !== 'ESRCH';
  }
}

function logHelp(invalidOption) {
  log(
  // eslint-disable-next-line
  '\n' + (invalidOption ? invalidOption + '\n' : '') + 'shadowsocks-js ' + _package.version + '\nYou can supply configurations via either config file or command line arguments.\n\nProxy options:\n  -c CONFIG_FILE                path to config file\n  -s SERVER_ADDR                server address, default: 0.0.0.0\n  -p SERVER_PORT                server port, default: 8083\n  -l LOCAL_ADDR                 local binding address, default: 127.0.0.1\n  -b LOCAL_PORT                 local port, default: 1080\n  -k PASSWORD                   password\n  -m METHOD                     encryption method, default: aes-128-cfb\n  -t TIMEOUT                    timeout in seconds, default: 600\n  --pac_port PAC_PORT           PAC file server port, default: 8090\n  --pac_update_gfwlist [URL]    [localssjs] Update the gfwlist\n                                for PAC server. You can specify the\n                                request URL.\n  --level LOG_LEVEL             log level, default: warn\n                                example: --level verbose\nGeneral options:\n  -h, --help                    show this help message and exit\n  -d start/stop/restart         daemon mode\n');
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

function startDaemon(isServer) {
  // TODO: `node` or with path?
  var child = (0, _child_process.spawn)('node', [_path2.default.join(__dirname, './pm'), getDaemonType(isServer)].concat(process.argv.slice(2)), SPAWN_OPTIONS);

  child.disconnect();
  // do not wait for child
  child.unref();

  (0, _pid.writePidFile)(getDaemonType(isServer), child.pid);
  log('start');

  return child;
}

function stopDaemon(isServer, pid) {
  if (pid) {
    (0, _pid.deletePidFile)(getDaemonType(isServer));
    (0, _utils.safelyKill)(pid, 'SIGHUP');
    log('stop');
  } else {
    log('already stopped');
  }
}

function runDaemon(isServer, cmd) {
  var pid = (0, _pid.getPid)(getDaemonType(isServer));
  var running = isRunning(pid);

  if (pid && !running) {
    log('previous daemon unexpectedly exited');
    (0, _pid.deletePidFile)(getDaemonType(isServer));
    pid = null;
  }

  switch (cmd) {
    case _config.DAEMON_COMMAND.start:
      if (pid) {
        log('already started');
      } else {
        startDaemon(isServer);
      }
      return;
    case _config.DAEMON_COMMAND.stop:
      stopDaemon(isServer, pid);
      return;
    case _config.DAEMON_COMMAND.restart:
      stopDaemon(isServer, pid);
      startDaemon(isServer);
      break;
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