'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inetNtoa = inetNtoa;
exports.inetAton = inetAton;
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