'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDstInfo = getDstInfo;
exports.inetNtoa = inetNtoa;
exports.inetAton = inetAton;
exports.getConfig = getConfig;

var _path = require('path');

var _fs = require('fs');

function getDstInfo(data) {
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  var atyp = data[3];

  var dstAddr = void 0;
  var dstPort = void 0;
  var dstAddrLength = void 0;
  var dstPortIndex = void 0;
  var dstPortEnd = void 0;
  var totalLength = void 0;

  switch (atyp) {
    case 0x01:
      dstAddrLength = 4;
      dstAddr = data.slice(4, 8);
      dstPort = data.slice(8, 10);
      totalLength = 10;
      break;
    case 0x04:
      dstAddrLength = 16;
      dstAddr = data.slice(4, 20);
      dstPort = data.slice(20, 22);
      totalLength = 22;
      break;
    case 0x03:
      dstAddrLength = data[4];
      dstPortIndex = 5 + dstAddrLength;
      dstAddr = data.slice(5, dstPortIndex);
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