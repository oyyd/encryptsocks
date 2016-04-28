'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getArgv = getArgv;
exports.writeOrPause = writeOrPause;
exports.getDstInfo = getDstInfo;
exports.inetNtoa = inetNtoa;
exports.inetAton = inetAton;
exports.getConfig = getConfig;
exports.getDstStr = getDstStr;

var _path = require('path');

var _fs = require('fs');

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getArgv() {
  return (0, _minimist2.default)(process.argv.slice(2));
}

function writeOrPause(fromCon, toCon, data) {
  var res = toCon.write(data);

  if (!res) {
    fromCon.pause();
  }

  return res;
}

function getDstInfo(data, isServer) {
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  // Yet shadowsocks begin with ATYP.

  var offset = isServer ? 0 : 3;
  var atyp = data[offset];

  var dstAddr = void 0;
  var dstPort = void 0;
  var dstAddrLength = void 0;
  var dstPortIndex = void 0;
  var dstPortEnd = void 0;
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

function inetNtoa(buf) {
  return buf[0] + '.' + buf[1] + '.' + buf[2] + '.' + buf[3];
}

function inetAton(ipStr) {
  var parts = ipStr.split('.');
  if (parts.length !== 4) {
    return null;
  }

  var buf = new Buffer(4);

  parts.forEach(function (part, i) {
    buf[i] = part;
  });

  return buf;
}

function getConfig() {
  return JSON.parse((0, _fs.readFileSync)((0, _path.join)(__dirname, '../config.json')));
}

function getDstStr(dstInfo) {
  if (!dstInfo) {
    return null;
  }

  switch (dstInfo.atyp) {
    case 1:
    case 4:
      return inetNtoa(dstInfo.dstAddr) + ':' + dstInfo.dstPort.readUInt16BE();
    case 3:
      return dstInfo.dstAddr.toString('utf8') + ':' + dstInfo.dstPort.readUInt16BE();
    default:
      return 'WARN: invalid atyp';
  }
}