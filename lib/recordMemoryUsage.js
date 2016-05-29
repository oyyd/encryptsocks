'use strict';

exports.__esModule = true;
exports.INTERVAL_TIME = undefined;
exports.record = record;
exports.stopRecord = stopRecord;

var _fs = require('fs');

var _path = require('path');

// NOTE: do not use this in production
var INTERVAL_TIME = exports.INTERVAL_TIME = 1000;

var data = null;

function record(frame) {
  data = data || [];

  data.push(frame);
}

function stopRecord() {
  if (data) {
    (0, _fs.writeFileSync)((0, _path.join)(__dirname, '../logs/memory.json'), JSON.stringify(data));
  }
}