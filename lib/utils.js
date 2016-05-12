'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mkdirIfNotExistSync = mkdirIfNotExistSync;
exports.sendDgram = sendDgram;
exports.writeOrPause = writeOrPause;
exports.getDstInfo = getDstInfo;
exports.getDstInfoFromUDPMsg = getDstInfoFromUDPMsg;
exports.formatConfig = formatConfig;
exports.getDstStr = getDstStr;

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _fs = require('fs');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function mkdirIfNotExistSync(path) {
  try {
    (0, _fs.accessSync)(path);
  } catch (e) {
    (0, _fs.mkdirSync)(path);
  }
}

function sendDgram(socket, data) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
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

function _getDstInfo(data, offset) {
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

  return {
    atyp: atyp, dstAddrLength: dstAddrLength, dstAddr: dstAddr, dstPort: dstPort,
    totalLength: totalLength
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
  return _getDstInfo(data, offset);
}

function getDstInfoFromUDPMsg(data, isServer) {
  // +----+------+------+----------+----------+----------+
  // |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
  // +----+------+------+----------+----------+----------+
  // | 2  |  1   |  1   | Variable |    2     | Variable |
  // +----+------+------+----------+----------+----------+

  var offset = isServer ? 0 : 3;

  return _getDstInfo(data, offset);
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
    if (formattedConfig.hasOwnProperty(key)) {
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