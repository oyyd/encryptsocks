'use strict';

exports.__esModule = true;
exports.BufferFrom = undefined;
exports.isWindows = isWindows;
exports.safelyKill = safelyKill;
exports.safelyKillChild = safelyKillChild;
exports.fileLog = fileLog;
exports.createSafeAfterHandler = createSafeAfterHandler;
exports.closeSilently = closeSilently;
exports.mkdirIfNotExistSync = mkdirIfNotExistSync;
exports.sendDgram = sendDgram;
exports.writeOrPause = writeOrPause;
exports.getDstInfo = getDstInfo;
exports.getDstInfoFromUDPMsg = getDstInfoFromUDPMsg;
exports.formatConfig = formatConfig;
exports.getDstStr = getDstStr;

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _fs = require('fs');

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DEFAULT_PATH = (0, _path.join)(__dirname, '../logs/debug.log');
var hasOwnProperty = {}.hasOwnProperty;

var platform = null;

var BufferFrom = exports.BufferFrom = function () {
  try {
    Buffer.from('aa', 'hex');
  } catch (err) {
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return new (Function.prototype.bind.apply(Buffer, [null].concat(args)))();
    };
  }

  return Buffer.from;
}();

function isWindows() {
  if (!platform) {
    platform = _os2.default.type();
  }

  return platform === 'Windows_NT';
}

function safelyKill(pid, signal) {
  if (pid === null || pid === undefined) {
    return;
  }

  if (signal && !isWindows()) {
    process.kill(pid, signal);
  } else {
    process.kill(pid);
  }
}

function safelyKillChild(child, signal) {
  if (!child) {
    return;
  }

  if (signal && !isWindows()) {
    child.kill(signal);
  } else {
    child.kill();
  }
}

function fileLog(content) {
  var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_PATH;

  (0, _fs.writeFileSync)(path, content);
}

// NOTE: https://github.com/winstonjs/winston/issues/228
// Winston will log things asynchronously so we have to
// make sure it has log the error before exiting this
// process.
// And this is disappointing.
function createSafeAfterHandler(logger, next) {
  var numFlushes = 0;
  var numFlushed = 0;

  return function () {
    Object.keys(logger.transports).forEach(function (k) {
      // eslint-disable-next-line
      var stream = logger.transports[k]._stream;
      if (stream) {
        numFlushes += 1;
        stream.once('finish', function () {
          numFlushed += 1;
          if (numFlushes === numFlushed) {
            next();
          }
        });
        stream.end();
      }
    });

    if (numFlushes === 0) {
      next();
    }
  };
}

function closeSilently(server) {
  if (server) {
    try {
      server.close();
    } catch (e) {
      // already closed
    }
  }
}

function mkdirIfNotExistSync(path) {
  try {
    (0, _fs.accessSync)(path);
  } catch (e) {
    (0, _fs.mkdirSync)(path);
  }
}

function sendDgram(socket, data) {
  for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
    args[_key2 - 2] = arguments[_key2];
  }

  socket.send.apply(socket, [data, 0, data.length].concat(args));
}

function writeOrPause(fromCon, toCon, data) {
  var res = toCon.write(data);

  if (!res) {
    fromCon.pause();
  }

  return res;
}

function parseDstInfo(data, offset) {
  var atyp = data[offset];

  var dstAddr = void 0;
  var dstPort = void 0;
  var dstAddrLength = void 0;
  var dstPortIndex = void 0;
  var dstPortEnd = void 0;
  // length of non-data field
  var totalLength = void 0;

  switch (atyp) {
    case 0x01:
      dstAddrLength = 4;
      dstAddr = data.slice(offset + 1, offset + 5);
      dstPort = data.slice(offset + 5, offset + 7);
      totalLength = offset + 7;
      break;
    case 0x04:
      dstAddrLength = 16;
      dstAddr = data.slice(offset + 1, offset + 17);
      dstPort = data.slice(offset + 17, offset + 19);
      totalLength = offset + 19;
      break;
    case 0x03:
      dstAddrLength = data[offset + 1];
      dstPortIndex = 2 + offset + dstAddrLength;
      dstAddr = data.slice(offset + 2, dstPortIndex);
      dstPortEnd = dstPortIndex + 2;
      dstPort = data.slice(dstPortIndex, dstPortEnd);
      totalLength = dstPortEnd;
      break;
    default:
      return null;
  }

  if (data.length < totalLength) {
    return null;
  }

  return {
    atyp: atyp, dstAddrLength: dstAddrLength, dstAddr: dstAddr, dstPort: dstPort, totalLength: totalLength
  };
}

function getDstInfo(data, isServer) {
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  // Yet shadowsocks begin with ATYP.

  var offset = isServer ? 0 : 3;
  return parseDstInfo(data, offset);
}

function getDstInfoFromUDPMsg(data, isServer) {
  // +----+------+------+----------+----------+----------+
  // |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
  // +----+------+------+----------+----------+----------+
  // | 2  |  1   |  1   | Variable |    2     | Variable |
  // +----+------+------+----------+----------+----------+

  var offset = isServer ? 0 : 3;

  return parseDstInfo(data, offset);
}

var formatKeyValues = {
  server: 'serverAddr',
  server_port: 'serverPort',
  local_addr: 'localAddr',
  local_port: 'localPort',
  local_addr_ipv6: 'localAddrIPv6',
  server_addr_ipv6: 'serverAddrIPv6'
};

function formatConfig(_config) {
  var formattedConfig = Object.assign({}, _config);

  Object.keys(formatKeyValues).forEach(function (key) {
    if (hasOwnProperty.call(formattedConfig, key)) {
      formattedConfig[formatKeyValues[key]] = formattedConfig[key];
      delete formattedConfig[key];
    }
  });

  return formattedConfig;
}

function getDstStr(dstInfo) {
  if (!dstInfo) {
    return null;
  }

  switch (dstInfo.atyp) {
    case 1:
    case 4:
      return _ip2.default.toString(dstInfo.dstAddr) + ':' + dstInfo.dstPort.readUInt16BE();
    case 3:
      return dstInfo.dstAddr.toString('utf8') + ':' + dstInfo.dstPort.readUInt16BE();
    default:
      return 'WARN: invalid atyp';
  }
}
