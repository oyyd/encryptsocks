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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJzdGFydFNlcnZlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O3FCQUFTQSxXOzs7Ozs7Ozs7b0JBQ0FBLFciLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgeyBzdGFydFNlcnZlciBhcyBjcmVhdGVTZXJ2ZXIgfSBmcm9tICcuL3NzU2VydmVyJztcbmV4cG9ydCB7IHN0YXJ0U2VydmVyIGFzIGNyZWF0ZUNsaWVudCB9IGZyb20gJy4vc3NMb2NhbCc7XG4iXX0=