'use strict';

exports.__esModule = true;
exports.getPid = getPid;
exports.writePidFile = writePidFile;
exports.deletePidFile = deletePidFile;

var _fs = require('fs');

var _path = require('path');

var _utils = require('./utils');

var TMP_PATH = (0, _path.join)(__dirname, '../tmp');

function getFileName(type) {
  switch (type) {
    case 'local':
      return (0, _path.join)(TMP_PATH, 'local.pid');
    case 'server':
      return (0, _path.join)(TMP_PATH, 'server.pid');
    default:
      throw new Error('invalid \'type\' of filename ' + type);
  }
}

function getPid(type) {
  var fileName = getFileName(type);

  (0, _utils.mkdirIfNotExistSync)(TMP_PATH);

  try {
    (0, _fs.accessSync)(fileName);
  } catch (e) {
    return null;
  }

  return (0, _fs.readFileSync)(fileName).toString('utf8');
}

function writePidFile(type, pid) {
  (0, _utils.mkdirIfNotExistSync)(TMP_PATH);

  (0, _fs.writeFileSync)(getFileName(type), pid);
}

function deletePidFile(type) {
  (0, _utils.mkdirIfNotExistSync)(TMP_PATH);

  try {
    (0, _fs.unlinkSync)(getFileName(type));
  } catch (err) {
    // alreay unlinked
  }
}