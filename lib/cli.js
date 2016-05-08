'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConfig = getConfig;
exports.logHelp = logHelp;

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _defaultConfig = require('./defaultConfig');

var _defaultConfig2 = _interopRequireDefault(_defaultConfig);

var _package = require('../package.json');

var _config = require('../config.json');

var _config2 = _interopRequireDefault(_config);

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
  help: 'help'
};

function getArgvOptions() {
  var generalOptions = {};
  var proxyOptions = {};
  var configPair = (0, _minimist2.default)(process.argv.slice(2));

  var optionsType = [{
    options: proxyOptions,
    keys: Object.keys(PROXY_ARGUMENT_PAIR),
    values: PROXY_ARGUMENT_PAIR
  }, {
    options: generalOptions,
    keys: Object.keys(GENERAL_ARGUMENT_PAIR),
    values: GENERAL_ARGUMENT_PAIR
  }];

  Object.keys(configPair).forEach(function (key) {
    optionsType.forEach(function (optType) {
      var i = optType.keys.indexOf(key);

      if (~i) {
        optType.options[optType.values[optType.keys[i]]] = configPair[key]; // eslint-disable-line
      }
    });
  });

  return {
    generalOptions: generalOptions, proxyOptions: proxyOptions
  };
}

function getConfig() {
  var _getArgvOptions = getArgvOptions();

  var generalOptions = _getArgvOptions.generalOptions;
  var proxyOptions = _getArgvOptions.proxyOptions;

  var res = {
    generalOptions: generalOptions,
    proxyOptions: Object.assign({}, _defaultConfig2.default, _config2.default, proxyOptions)
  };

  return res;
}

function logHelp() {
  console.log( // eslint-disable-line
  '\nshadowsock-js ' + _package.version + '\nYou can supply configurations via either config file or command line arguments.\n\nProxy options:\n  -s SERVER_ADDR         server address, default: 127.0.0.1\n  -p SERVER_PORT         server port, default: 8083\n  -k PASSWORD            password\n  -m METHOD              encryption method, default: aes-128-cfb\n  -t TIMEOUT             timeout in seconds, default: 600\n\nGeneral options:\n  -h, --help             show this help message and exit\n');
}