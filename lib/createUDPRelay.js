'use strict';

exports.__esModule = true;
exports.default = createUDPRelay;

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _utils = require('./utils');

var _encryptor = require('./encryptor');

var encryptor = _interopRequireWildcard(_encryptor);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

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

var NAME = 'udp_relay';
var LRU_OPTIONS = {
  max: 1000,
  maxAge: 10 * 1000,
  dispose: function dispose(key, socket) {
    // close socket if it's not closed
    if (socket) {
      socket.close();
    }
  }
};
var SOCKET_TYPE = ['udp4', 'udp6'];

function getIndex(_ref, _ref2) {
  var address = _ref.address,
      port = _ref.port;
  var dstAddrStr = _ref2.dstAddrStr,
      dstPortNum = _ref2.dstPortNum;

  return address + ':' + port + '_' + dstAddrStr + ':' + dstPortNum;
}

function createClient(logger, _ref3, onMsg, onClose) {
  var atyp = _ref3.atyp,
      dstAddr = _ref3.dstAddr,
      dstPort = _ref3.dstPort;

  var udpType = atyp === 1 ? 'udp4' : 'udp6';
  var socket = _dgram2.default.createSocket(udpType);

  socket.on('message', onMsg);

  socket.on('error', function (e) {
    logger.warn(NAME + ' client socket gets error: ' + e.message);
  });

  socket.on('close', onClose);

  return socket;
}

function createUDPRelaySocket(udpType, config, isServer, logger) {
  var localPort = config.localPort,
      serverPort = config.serverPort,
      password = config.password,
      method = config.method;

  var serverAddr = udpType === 'udp4' ? config.serverAddr : config.serverAddrIPv6;

  var encrypt = encryptor.encrypt.bind(null, password, method);
  var decrypt = encryptor.decrypt.bind(null, password, method);
  var socket = _dgram2.default.createSocket(udpType);
  var cache = new _lruCache2.default(Object.assign({}, LRU_OPTIONS, {
    maxAge: config.timeout * 1000
  }));
  var listenPort = isServer ? serverPort : localPort;

  socket.on('message', function (_msg, rinfo) {
    var msg = isServer ? decrypt(_msg) : _msg;
    var frag = msg[2];

    if (frag !== 0) {
      // drop those datagram that using frag
      return;
    }

    var dstInfo = (0, _utils.getDstInfoFromUDPMsg)(msg, isServer);
    var dstAddrStr = _ip2.default.toString(dstInfo.dstAddr);
    var dstPortNum = dstInfo.dstPort.readUInt16BE();
    var index = getIndex(rinfo, { dstAddrStr: dstAddrStr, dstPortNum: dstPortNum });

    logger.debug(NAME + ' receive message: ' + msg.toString('hex'));

    var client = cache.get(index);

    if (!client) {
      client = createClient(logger, dstInfo, function (msgStream) {
        // socket on message
        var incomeMsg = isServer ? encrypt(msgStream) : decrypt(msgStream);
        (0, _utils.sendDgram)(socket, incomeMsg, rinfo.port, rinfo.address);
      }, function () {
        // socket on close
        cache.del(index);
      });
      cache.set(index, client);
    }

    if (isServer) {
      (0, _utils.sendDgram)(client, msg.slice(dstInfo.totalLength), dstPortNum, dstAddrStr);
    } else {
      (0, _utils.sendDgram)(client,
      // skip RSV and FLAG
      encrypt(msg.slice(3)), serverPort, serverAddr);
    }
  });

  socket.on('error', function (err) {
    logger.error(NAME + ' socket err: ' + err.message);
    socket.close();
  });

  socket.on('close', function () {
    cache.reset();
  });

  socket.bind(listenPort, function () {
    logger.verbose(NAME + ' is listening on: ' + listenPort);
  });

  return socket;
}

function close(sockets) {
  sockets.forEach(function (socket) {
    (0, _utils.closeSilently)(socket);
  });
}

function createUDPRelay(config, isServer, logger) {
  var sockets = SOCKET_TYPE.map(function (udpType) {
    return createUDPRelaySocket(udpType, config, isServer, logger);
  });

  return {
    sockets: sockets,
    close: close.bind(null, sockets)
  };
}