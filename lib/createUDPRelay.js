'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createUDPRelay;

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _utils = require('./utils');

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// SOCKS5 UDP Request
// +----+------+------+----------+----------+----------+
// |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +----+------+------+----------+----------+----------+
// | 2  |  1   |  1   | Variable |    2     | Variable |
// +----+------+------+----------+----------+----------+
//
// SOCKS5 UDP Response
// +----+------+------+----------+----------+----------+
// |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +----+------+------+----------+----------+----------+
// | 2  |  1   |  1   | Variable |    2     | Variable |
// +----+------+------+----------+----------+----------+
//
// shadowsocks UDP Request (before encrypted)
// +------+----------+----------+----------+
// | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +------+----------+----------+----------+
// |  1   | Variable |    2     | Variable |
// +------+----------+----------+----------+
//
// shadowsocks UDP Response (before encrypted)
// +------+----------+----------+----------+
// | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +------+----------+----------+----------+
// |  1   | Variable |    2     | Variable |
// +------+----------+----------+----------+
//
// shadowsocks UDP Request and Response (after encrypted)
// +-------+--------------+
// |   IV  |    PAYLOAD   |
// +-------+--------------+
// | Fixed |   Variable   |
// +-------+--------------+

var NAME = 'UDP relay';
var LRU_OPTIONS = {
  max: 100,
  maxAge: 10 * 1000,
  dispose: function dispose(key, socket) {
    // close socket if it's not closed
    if (socket) {
      socket.close();
    }
  }
};

// TODO: do we actually need multiple client sockets?
// TODO: remove invalid clients

function getIndex(_ref, _ref2) {
  var address = _ref.address;
  var port = _ref.port;
  var dstAddrStr = _ref2.dstAddrStr;
  var dstPortNum = _ref2.dstPortNum;

  return address + ':' + port + '_' + dstAddrStr + ':' + dstPortNum;
}

function createClient(_ref3, onMsg, onClose) {
  var atyp = _ref3.atyp;
  var dstAddr = _ref3.dstAddr;
  var dstPort = _ref3.dstPort;

  // TODO: what about domain type
  var udpType = atyp === 1 ? 'udp4' : 'udp6';
  var socket = _dgram2.default.createSocket(udpType);

  socket.on('message', onMsg);

  socket.on('error', function (e) {
    _logger2.default.warn(NAME + ' client socket gets error: ' + e.message);
  });

  socket.on('close', onClose);

  return socket;
}

function createUDPRelay(config, isServer) {
  var localPort = config.localPort;
  var serverAddr = config.serverAddr;
  var serverPort = config.serverPort;
  // TODO: support udp6

  var socket = _dgram2.default.createSocket('udp4');
  var cache = new _lruCache2.default(LRU_OPTIONS);
  var listenPort = isServer ? serverPort : localPort;

  socket.on('message', function (msg, rinfo) {
    // TODO: drop
    _logger2.default.warn(NAME + ' receive message: ' + msg.toString('hex'));
    var dstInfo = (0, _utils.getDstInfoFromUDPMsg)(msg, isServer);
    console.log(NAME + ' receive dstInfo', dstInfo);
    var dstAddrStr = (0, _utils.inetNtoa)(dstInfo.dstAddr);
    var dstPortNum = dstInfo.dstPort.readUInt16BE();
    var index = getIndex(rinfo, { dstAddrStr: dstAddrStr, dstPortNum: dstPortNum });
    console.log('enter');

    var client = cache.get(index);

    if (!client) {
      client = createClient(dstInfo, function (incomeMsg) {
        // TODO: decipher
        (0, _utils.sendDgram)(socket, incomeMsg, rinfo.port, rinfo.address);
      }, function () {
        cache.del(index);
      });
      cache.set(index, client);
    }

    // TODO: after connected
    // TODO: cipher
    if (isServer) {
      (0, _utils.sendDgram)(client, msg.slice(dstInfo.totalLength), dstPortNum, dstAddrStr);
    } else {
      (0, _utils.sendDgram)(client,
      // skip RSV and FLAG
      msg.slice(3), serverPort, serverAddr);
    }
  });

  socket.on('error', function (err) {
    _logger2.default.debug(NAME + ' socket err: ' + err.message);
    socket.close();
  });

  socket.on('close', function () {
    cache.reset();
  });

  socket.bind(listenPort, function () {
    _logger2.default.verbose(NAME + ' is listening on: ' + listenPort);
  });

  return socket;
}
