'use strict';

exports.__esModule = true;
exports.GFWLIST_FILE_PATH = undefined;
exports.readLine = readLine;
exports.createListArrayString = createListArrayString;
exports.createPACFileContent = createPACFileContent;
exports.requestGFWList = requestGFWList;
exports.getPACFileContent = getPACFileContent;
exports.updateGFWList = updateGFWList;

var _path = require('path');

var _https = require('https');

var _http = require('http');

var _url = require('url');

var _fs = require('fs');

var _uglifyJs = require('uglify-js');

// NOTE: do not use these in local server
var GFWLIST_FILE_PATH = exports.GFWLIST_FILE_PATH = (0, _path.join)(__dirname, '../pac/gfwlist.txt');
var DEFAULT_CONFIG = {
  localAddr: '127.0.0.1',
  localPort: '1080'
};
var TARGET_URL = 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt';
var LINE_DELIMER = ['\r\n', '\r', '\n'];
var MINIFY_OPTIONS = {
  fromString: true
};

var readLineLastContent = null;
var readLineLastIndex = 0;

function clear() {
  readLineLastContent = null;
  readLineLastIndex = 0;
}

function readLine(text, shouldStrip) {
  var startIndex = 0;
  var i = null;
  var delimer = null;

  if (text === readLineLastContent) {
    startIndex = readLineLastIndex;
  } else {
    readLineLastContent = text;
  }

  LINE_DELIMER.forEach(function (char) {
    var index = text.indexOf(char, startIndex);

    if (index !== -1 && (i === null || index < i)) {
      i = index;
      delimer = char;
    }
  });

  if (i !== null) {
    readLineLastIndex = i + delimer.length;
    return shouldStrip ? text.slice(startIndex, i) : text.slice(startIndex, readLineLastIndex);
  }

  readLineLastIndex = 0;
  return null;
}

readLine.clear = clear;

function shouldDropLine(line) {
  // NOTE: It's possible that gfwlist has rules that is a too long
  // regexp that may crush proxies like 'SwitchySharp' so we would
  // drop these rules here.
  return !line || line[0] === '!' || line[0] === '[' || line.length > 100;
}

var slashReg = /\//g;

function encode(line) {
  return line.replace(slashReg, '\\/');
}

function createListArrayString(text) {
  var list = [];
  var line = readLine(text, true);

  while (line !== null) {
    if (!shouldDropLine(line)) {
      list.push('"' + encode(line) + '"');
    }

    line = readLine(text, true);
  }

  return 'var rules = [' + list.join(',\n') + '];';
}

function createPACFileContent(text, _ref) {
  var localAddr = _ref.localAddr,
      localPort = _ref.localPort;

  var HOST = localAddr + ':' + localPort;
  var readFileOptions = { encoding: 'utf8' };
  var userRulesString = (0, _fs.readFileSync)((0, _path.join)(__dirname, '../pac/user.txt'), readFileOptions);
  var rulesString = createListArrayString(userRulesString + '\n' + text);
  var SOCKS_STR = 'var proxy = "SOCKS5 ' + HOST + '; SOCKS ' + HOST + '; DIRECT;";';
  var matcherString = (0, _fs.readFileSync)((0, _path.join)(__dirname, '../vendor/ADPMatcher.js'), readFileOptions);

  return SOCKS_STR + '\n' + rulesString + '\n' + matcherString;
}

function requestGFWList(targetURL, next) {
  var options = (0, _url.parse)(targetURL);
  var requestMethod = options.protocol.indexOf('https') >= 0 ? _https.request : _http.request;

  var req = requestMethod(options, function (res) {
    var data = null;

    res.on('data', function (chunk) {
      data = data ? Buffer.concat([data, chunk]) : chunk;
    });

    res.on('end', function () {
      // gfwlist.txt use utf8 encoded content to present base64 content
      var listText = Buffer.from(data.toString(), 'base64');
      next(null, listText);
    });
  });

  req.on('error', function (err) {
    next(err);
  });

  req.end();
}

function minifyCode(code) {
  return (0, _uglifyJs.minify)(code, MINIFY_OPTIONS).code;
}

// TODO: async this
function getPACFileContent(_config) {
  var config = _config || DEFAULT_CONFIG;
  var listText = (0, _fs.readFileSync)(GFWLIST_FILE_PATH, { encoding: 'utf8' });

  return minifyCode(createPACFileContent(listText, config));
}

function writeGFWList(listBuffer, next) {
  (0, _fs.writeFile)(GFWLIST_FILE_PATH, listBuffer, next);
}

function updateGFWList() {
  var targetURL = TARGET_URL;
  var next = void 0;

  if (arguments.length === 1) {
    next = arguments.length <= 0 ? undefined : arguments[0];
  } else if (arguments.length === 2) {
    targetURL = arguments.length <= 0 ? undefined : arguments[0];
    next = arguments.length <= 1 ? undefined : arguments[1];
  }

  requestGFWList(targetURL, function (err, listBuffer) {
    if (err) {
      next(err);
      return;
    }

    writeGFWList(listBuffer, next);
  });
}