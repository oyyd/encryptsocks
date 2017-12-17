'use strict';

exports.__esModule = true;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// proxy options
var DEFAULT_CONFIG = {
  serverAddr: '0.0.0.0',
  serverPort: 8083,
  localAddr: '127.0.0.1',
  localPort: 1080,
  password: 'YOUR_PASSWORD_HERE',
  pacServerPort: 8090,
  timeout: 600,
  method: 'aes-128-cfb',
  level: 'warn',
  logPath: _path2.default.resolve(__dirname, '../logs'),

  // ipv6
  localAddrIPv6: '::1',
  serverAddrIPv6: '::1',

  // dev options
  _recordMemoryUsage: false
};

exports.default = DEFAULT_CONFIG;