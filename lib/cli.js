'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConfig = getConfig;
exports.default = client;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _child_process = require('child_process');

var _defaultConfig = require('./defaultConfig');

var _defaultConfig2 = _interopRequireDefault(_defaultConfig);

var _package = require('../package.json');

var _config = require('../config.json');

var _config2 = _interopRequireDefault(_config);

var _ssLocal = require('./ssLocal');

var ssLocal = _interopRequireWildcard(_ssLocal);

var _ssServer = require('./ssServer');

var ssServer = _interopRequireWildcard(_ssServer);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PROXY_ARGUMENT_PAIR = {
  s: 'serverAddr',
  p: 'serverPort',
  k: 'password',
  m: 'method',
  t: 'timeout',
  level: 'level'
};

var GENERAL_ARGUMENT_PAIR = {
  h: 'help',
  help: 'help',
  d: 'daemon'
};

var SPAWN_OPTIONS = {
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore', 'ipc']
};

var DAEMON_COMMAND = {
  start: 0,
  stop: 1,
  restart: 2
};

function getArgvOptions(argv) {
  var generalOptions = {};
  var proxyOptions = {};
  var configPair = (0, _minimist2.default)(argv);
  var optionsType = [{
    options: proxyOptions,
    keys: Object.keys(PROXY_ARGUMENT_PAIR),
    values: PROXY_ARGUMENT_PAIR
  }, {
    options: generalOptions,
    keys: Object.keys(GENERAL_ARGUMENT_PAIR),
    values: GENERAL_ARGUMENT_PAIR
  }];

  var invalidOption = null;

  Object.keys(configPair).forEach(function (key) {
    if (key === '_') {
      return;
    }

    var hit = false;

    optionsType.forEach(function (optType) {
      var i = optType.keys.indexOf(key);

      if (~i) {
        optType.options[optType.values[optType.keys[i]]] = configPair[key]; // eslint-disable-line
        hit = true;
      }
    });

    if (!hit) {
      invalidOption = key;
    }
  });

  if (invalidOption) {
    invalidOption = invalidOption.length === 1 ? '-' + invalidOption : '--' + invalidOption;
  } else if (generalOptions.daemon && !!! ~Object.keys(DAEMON_COMMAND).indexOf(generalOptions.daemon)) {
    invalidOption = 'invalid daemon command: ' + generalOptions.daemon;
  }

  return {
    generalOptions: generalOptions, proxyOptions: proxyOptions, invalidOption: invalidOption
  };
}

function getConfig(argv) {
  var _getArgvOptions = getArgvOptions(argv);

  var generalOptions = _getArgvOptions.generalOptions;
  var proxyOptions = _getArgvOptions.proxyOptions;
  var invalidOption = _getArgvOptions.invalidOption;

  var res = {
    generalOptions: generalOptions, invalidOption: invalidOption,
    proxyOptions: Object.assign({}, _defaultConfig2.default, _config2.default, proxyOptions)
  };

  return res;
}

function logHelp(invalidOption) {
  console.log( // eslint-disable-line
  '\n' + (invalidOption ? invalidOption + '\n' : null) + 'shadowsock-js ' + _package.version + '\nYou can supply configurations via either config file or command line arguments.\n\nProxy options:\n  -s SERVER_ADDR         server address, default: 127.0.0.1\n  -p SERVER_PORT         server port, default: 8083\n  -k PASSWORD            password\n  -m METHOD              encryption method, default: aes-128-cfb\n  -t TIMEOUT             timeout in seconds, default: 600\n\nGeneral options:\n  -h, --help             show this help message and exit\n  -d start/stop/restart  daemon mode\n');
}

function runDaemon(isServer) {
  // TODO: `node` or with path?
  var child = (0, _child_process.spawn)('node', [_path2.default.join(__dirname, 'daemon'), isServer ? 'server' : 'local'].concat(process.argv.slice(2)), SPAWN_OPTIONS);

  child.disconnect();
  // do not wait for child
  child.unref();
}

function runSingle(isServer) {}

function client(isServer) {
  var argv = process.argv.slice(2);

  var _getConfig = getConfig(argv);

  var generalOptions = _getConfig.generalOptions;
  var invalidOption = _getConfig.invalidOption;


  if (generalOptions.help || invalidOption) {
    logHelp(invalidOption);
  } else if (generalOptions.daemon) {
    runDaemon();
  } else {
    runSingle();
  }
}