'use strict';

exports.__esModule = true;
// proxy options
var DEFAULT_CONFIG = {
  serverAddr: '127.0.0.1',
  serverPort: 8083,
  localAddr: '127.0.0.1',
  localPort: 1080,
  password: 'YOUR_PASSWORD_HERE',
  pacServerPort: 8090,
  timeout: 600,
  method: 'aes-128-cfb',
  level: 'warn',

  // ipv6
  localAddrIPv6: '::1',
  serverAddrIPv6: '::1',

  // dev options
  _recordMemoryUsage: false
};

exports.default = DEFAULT_CONFIG;