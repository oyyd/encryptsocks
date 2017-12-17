'use strict';

exports.__esModule = true;

var _ssServer = require('./ssServer');

Object.defineProperty(exports, 'createServer', {
  enumerable: true,
  get: function get() {
    return _ssServer.startServer;
  }
});

var _ssLocal = require('./ssLocal');

Object.defineProperty(exports, 'createClient', {
  enumerable: true,
  get: function get() {
    return _ssLocal.startServer;
  }
});