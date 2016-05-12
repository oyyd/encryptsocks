'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var DEFAULT_CONFIG = {
  serverAddr: '127.0.0.1',
  serverPort: 8083,
  localAddr: '127.0.0.1',
  localPort: 1080,
  password: 'YOUR_PASSWORD_HERE',
  timeout: 600,
  method: 'aes-128-cfb',

  level: 'warn',
  localAddrIPv6: '::1',
  serverAddrIPv6: '::1'
};

exports.default = DEFAULT_CONFIG;