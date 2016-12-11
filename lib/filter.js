'use strict';

exports.__esModule = true;
exports.setDenyList = setDenyList;
exports.filter = filter;

var _utils = require('./utils');

// TODO:
var defaultDenyList = [
  // /google/,
];
var denyListLength = defaultDenyList.length;

function setDenyList(denyList) {
  defaultDenyList = denyList;
  denyListLength = denyList.length;
}

function filter(dstInfo) {
  var dstStr = (0, _utils.getDstStr)(dstInfo);

  var i = void 0;

  for (i = 0; i < denyListLength; i += 1) {
    if (defaultDenyList[i].test(dstStr)) {
      return false;
    }
  }

  return true;
}