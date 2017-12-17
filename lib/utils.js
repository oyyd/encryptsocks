'use strict';

exports.__esModule = true;
exports.BufferFrom = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
exports.getPrefixedArgName = getPrefixedArgName;
exports.obj2Argv = obj2Argv;

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
  // Yet begin with ATYP.

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

function getPrefixedArgName(name) {
  return name.length === 1 ? '-' + name : '--' + name;
}

function obj2Argv(obj) {
  if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') {
    throw new Error('expect an object when stringify to argv');
  }

  var argv = '';

  Object.keys(obj).forEach(function (name) {
    var argName = getPrefixedArgName(name);
    var value = obj[name];
    var argValue = '';

    if (typeof value === 'boolean') {
      if (!value) {
        return;
      }
    } else {
      argValue = String(value);
    }

    var parts = argValue.length > 0 ? argName + ' ' + argValue : '' + argName;

    argv = argv + ' ' + parts;
  });

  return argv;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy5qcyJdLCJuYW1lcyI6WyJpc1dpbmRvd3MiLCJzYWZlbHlLaWxsIiwic2FmZWx5S2lsbENoaWxkIiwiZmlsZUxvZyIsImNyZWF0ZVNhZmVBZnRlckhhbmRsZXIiLCJjbG9zZVNpbGVudGx5IiwibWtkaXJJZk5vdEV4aXN0U3luYyIsInNlbmREZ3JhbSIsIndyaXRlT3JQYXVzZSIsImdldERzdEluZm8iLCJnZXREc3RJbmZvRnJvbVVEUE1zZyIsImZvcm1hdENvbmZpZyIsImdldERzdFN0ciIsImdldFByZWZpeGVkQXJnTmFtZSIsIm9iajJBcmd2IiwiREVGQVVMVF9QQVRIIiwiX19kaXJuYW1lIiwiaGFzT3duUHJvcGVydHkiLCJwbGF0Zm9ybSIsIkJ1ZmZlckZyb20iLCJCdWZmZXIiLCJmcm9tIiwiZXJyIiwiYXJncyIsInR5cGUiLCJwaWQiLCJzaWduYWwiLCJ1bmRlZmluZWQiLCJwcm9jZXNzIiwia2lsbCIsImNoaWxkIiwiY29udGVudCIsInBhdGgiLCJsb2dnZXIiLCJuZXh0IiwibnVtRmx1c2hlcyIsIm51bUZsdXNoZWQiLCJPYmplY3QiLCJrZXlzIiwidHJhbnNwb3J0cyIsImZvckVhY2giLCJrIiwic3RyZWFtIiwiX3N0cmVhbSIsIm9uY2UiLCJlbmQiLCJzZXJ2ZXIiLCJjbG9zZSIsImUiLCJzb2NrZXQiLCJkYXRhIiwic2VuZCIsImxlbmd0aCIsImZyb21Db24iLCJ0b0NvbiIsInJlcyIsIndyaXRlIiwicGF1c2UiLCJwYXJzZURzdEluZm8iLCJvZmZzZXQiLCJhdHlwIiwiZHN0QWRkciIsImRzdFBvcnQiLCJkc3RBZGRyTGVuZ3RoIiwiZHN0UG9ydEluZGV4IiwiZHN0UG9ydEVuZCIsInRvdGFsTGVuZ3RoIiwic2xpY2UiLCJpc1NlcnZlciIsImZvcm1hdEtleVZhbHVlcyIsInNlcnZlcl9wb3J0IiwibG9jYWxfYWRkciIsImxvY2FsX3BvcnQiLCJsb2NhbF9hZGRyX2lwdjYiLCJzZXJ2ZXJfYWRkcl9pcHY2IiwiX2NvbmZpZyIsImZvcm1hdHRlZENvbmZpZyIsImFzc2lnbiIsImtleSIsImNhbGwiLCJkc3RJbmZvIiwidG9TdHJpbmciLCJyZWFkVUludDE2QkUiLCJuYW1lIiwib2JqIiwiRXJyb3IiLCJhcmd2IiwiYXJnTmFtZSIsInZhbHVlIiwiYXJnVmFsdWUiLCJTdHJpbmciLCJwYXJ0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztRQW9CZ0JBLFMsR0FBQUEsUztRQVFBQyxVLEdBQUFBLFU7UUFZQUMsZSxHQUFBQSxlO1FBWUFDLE8sR0FBQUEsTztRQVNBQyxzQixHQUFBQSxzQjtRQTBCQUMsYSxHQUFBQSxhO1FBVUFDLG1CLEdBQUFBLG1CO1FBUUFDLFMsR0FBQUEsUztRQUlBQyxZLEdBQUFBLFk7UUF1REFDLFUsR0FBQUEsVTtRQVlBQyxvQixHQUFBQSxvQjtRQXFCQUMsWSxHQUFBQSxZO1FBYUFDLFMsR0FBQUEsUztRQWdCQUMsa0IsR0FBQUEsa0I7UUFJQUMsUSxHQUFBQSxROztBQXRPaEI7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBRUEsSUFBTUMsZUFBZSxnQkFBS0MsU0FBTCxFQUFnQixtQkFBaEIsQ0FBckI7QUFDQSxJQUFNQyxpQkFBaUIsR0FBR0EsY0FBMUI7O0FBRUEsSUFBSUMsV0FBVyxJQUFmOztBQUVPLElBQU1DLGtDQUFjLFlBQU07QUFDL0IsTUFBSTtBQUNGQyxXQUFPQyxJQUFQLENBQVksSUFBWixFQUFrQixLQUFsQjtBQUNELEdBRkQsQ0FFRSxPQUFPQyxHQUFQLEVBQVk7QUFDWixXQUFRO0FBQUEsd0NBQUlDLElBQUo7QUFBSUEsWUFBSjtBQUFBOztBQUFBLGdEQUFpQkgsTUFBakIsZ0JBQTJCRyxJQUEzQjtBQUFBLEtBQVI7QUFDRDs7QUFFRCxTQUFPSCxPQUFPQyxJQUFkO0FBQ0QsQ0FSeUIsRUFBbkI7O0FBVUEsU0FBU3JCLFNBQVQsR0FBcUI7QUFDMUIsTUFBSSxDQUFDa0IsUUFBTCxFQUFlO0FBQ2JBLGVBQVcsYUFBR00sSUFBSCxFQUFYO0FBQ0Q7O0FBRUQsU0FBT04sYUFBYSxZ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O0FBRUFELFdBQVVBLElBQVYsU0FBa0JLLEtBQWxCO0FBQ0QsR0FoQkQ7O0FBa0JBLFNBQU9MLElBQVA7QUFDRCIsImZpbGUiOiJ1dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpcCBmcm9tICdpcCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHsgd3JpdGVGaWxlU3luYywgYWNjZXNzU3luYywgbWtkaXJTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuXG5jb25zdCBERUZBVUxUX1BBVEggPSBqb2luKF9fZGlybmFtZSwgJy4uL2xvZ3MvZGVidWcubG9nJyk7XG5jb25zdCBoYXNPd25Qcm9wZXJ0eSA9IHt9Lmhhc093blByb3BlcnR5O1xuXG5sZXQgcGxhdGZvcm0gPSBudWxsO1xuXG5leHBvcnQgY29uc3QgQnVmZmVyRnJvbSA9ICgoKSA9PiB7XG4gIHRyeSB7XG4gICAgQnVmZmVyLmZyb20oJ2FhJywgJ2hleCcpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gKCguLi5hcmdzKSA9PiBuZXcgQnVmZmVyKC4uLmFyZ3MpKTtcbiAgfVxuXG4gIHJldHVybiBCdWZmZXIuZnJvbTtcbn0pKCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpbmRvd3MoKSB7XG4gIGlmICghcGxhdGZvcm0pIHtcbiAgICBwbGF0Zm9ybSA9IG9zLnR5cGUoKTtcbiAgfVxuXG4gIHJldHVybiBwbGF0Zm9ybSA9PT0gJ1dpbmRvd3NfTlQnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FmZWx5S2lsbChwaWQsIHNpZ25hbCkge1xuICBpZiAocGlkID09PSBudWxsIHx8IHBpZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHNpZ25hbCAmJiAhaXNXaW5kb3dzKCkpIHtcbiAgICBwcm9jZXNzLmtpbGwocGlkLCBzaWduYWwpO1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3Mua2lsbChwaWQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlbHlLaWxsQ2hpbGQoY2hpbGQsIHNpZ25hbCkge1xuICBpZiAoIWNoaWxkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHNpZ25hbCAmJiAhaXNXaW5kb3dzKCkpIHtcbiAgICBjaGlsZC5raWxsKHNpZ25hbCk7XG4gIH0gZWxzZSB7XG4gICAgY2hpbGQua2lsbCgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWxlTG9nKGNvbnRlbnQsIHBhdGggPSBERUZBVUxUX1BBVEgpIHtcbiAgd3JpdGVGaWxlU3luYyhwYXRoLCBjb250ZW50KTtcbn1cblxuLy8gTk9URTogaHR0cHM6Ly9naXRodWIuY29tL3dpbnN0b25qcy93aW5zdG9uL2lzc3Vlcy8yMjhcbi8vIFdpbnN0b24gd2lsbCBsb2cgdGhpbmdzIGFzeW5jaHJvbm91c2x5IHNvIHdlIGhhdmUgdG9cbi8vIG1ha2Ugc3VyZSBpdCBoYXMgbG9nIHRoZSBlcnJvciBiZWZvcmUgZXhpdGluZyB0aGlzXG4vLyBwcm9jZXNzLlxuLy8gQW5kIHRoaXMgaXMgZGlzYXBwb2ludGluZy5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYWZlQWZ0ZXJIYW5kbGVyKGxvZ2dlciwgbmV4dCkge1xuICBsZXQgbnVtRmx1c2hlcyA9IDA7XG4gIGxldCBudW1GbHVzaGVkID0gMDtcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIE9iamVjdC5rZXlzKGxvZ2dlci50cmFuc3BvcnRzKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICAgIGNvbnN0IHN0cmVhbSA9IGxvZ2dlci50cmFuc3BvcnRzW2tdLl9zdHJlYW07XG4gICAgICBpZiAoc3RyZWFtKSB7XG4gICAgICAgIG51bUZsdXNoZXMgKz0gMTtcbiAgICAgICAgc3RyZWFtLm9uY2UoJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgICBudW1GbHVzaGVkICs9IDE7XG4gICAgICAgICAgaWYgKG51bUZsdXNoZXMgPT09IG51bUZsdXNoZWQpIHtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAobnVtRmx1c2hlcyA9PT0gMCkge1xuICAgICAgbmV4dCgpO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3NlU2lsZW50bHkoc2VydmVyKSB7XG4gIGlmIChzZXJ2ZXIpIHtcbiAgICB0cnkge1xuICAgICAgc2VydmVyLmNsb3NlKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gYWxyZWFkeSBjbG9zZWRcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1rZGlySWZOb3RFeGlzdFN5bmMocGF0aCkge1xuICB0cnkge1xuICAgIGFjY2Vzc1N5bmMocGF0aCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBta2RpclN5bmMocGF0aCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlbmREZ3JhbShzb2NrZXQsIGRhdGEsIC4uLmFyZ3MpIHtcbiAgc29ja2V0LnNlbmQoZGF0YSwgMCwgZGF0YS5sZW5ndGgsIC4uLmFyZ3MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVPclBhdXNlKGZyb21Db24sIHRvQ29uLCBkYXRhKSB7XG4gIGNvbnN0IHJlcyA9IHRvQ29uLndyaXRlKGRhdGEpO1xuXG4gIGlmICghcmVzKSB7XG4gICAgZnJvbUNvbi5wYXVzZSgpO1xuICB9XG5cbiAgcmV0dXJuIHJlcztcbn1cblxuZnVuY3Rpb24gcGFyc2VEc3RJbmZvKGRhdGEsIG9mZnNldCkge1xuICBjb25zdCBhdHlwID0gZGF0YVtvZmZzZXRdO1xuXG4gIGxldCBkc3RBZGRyO1xuICBsZXQgZHN0UG9ydDtcbiAgbGV0IGRzdEFkZHJMZW5ndGg7XG4gIGxldCBkc3RQb3J0SW5kZXg7XG4gIGxldCBkc3RQb3J0RW5kO1xuICAvLyBsZW5ndGggb2Ygbm9uLWRhdGEgZmllbGRcbiAgbGV0IHRvdGFsTGVuZ3RoO1xuXG4gIHN3aXRjaCAoYXR5cCkge1xuICAgIGNhc2UgMHgwMTpcbiAgICAgIGRzdEFkZHJMZW5ndGggPSA0O1xuICAgICAgZHN0QWRkciA9IGRhdGEuc2xpY2Uob2Zmc2V0ICsgMSwgb2Zmc2V0ICsgNSk7XG4gICAgICBkc3RQb3J0ID0gZGF0YS5zbGljZShvZmZzZXQgKyA1LCBvZmZzZXQgKyA3KTtcbiAgICAgIHRvdGFsTGVuZ3RoID0gb2Zmc2V0ICsgNztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgwNDpcbiAgICAgIGRzdEFkZHJMZW5ndGggPSAxNjtcbiAgICAgIGRzdEFkZHIgPSBkYXRhLnNsaWNlKG9mZnNldCArIDEsIG9mZnNldCArIDE3KTtcbiAgICAgIGRzdFBvcnQgPSBkYXRhLnNsaWNlKG9mZnNldCArIDE3LCBvZmZzZXQgKyAxOSk7XG4gICAgICB0b3RhbExlbmd0aCA9IG9mZnNldCArIDE5O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDAzOlxuICAgICAgZHN0QWRkckxlbmd0aCA9IGRhdGFbb2Zmc2V0ICsgMV07XG4gICAgICBkc3RQb3J0SW5kZXggPSAyICsgb2Zmc2V0ICsgZHN0QWRkckxlbmd0aDtcbiAgICAgIGRzdEFkZHIgPSBkYXRhLnNsaWNlKG9mZnNldCArIDIsIGRzdFBvcnRJbmRleCk7XG4gICAgICBkc3RQb3J0RW5kID0gZHN0UG9ydEluZGV4ICsgMjtcbiAgICAgIGRzdFBvcnQgPSBkYXRhLnNsaWNlKGRzdFBvcnRJbmRleCwgZHN0UG9ydEVuZCk7XG4gICAgICB0b3RhbExlbmd0aCA9IGRzdFBvcnRFbmQ7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoZGF0YS5sZW5ndGggPCB0b3RhbExlbmd0aCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBhdHlwLCBkc3RBZGRyTGVuZ3RoLCBkc3RBZGRyLCBkc3RQb3J0LCB0b3RhbExlbmd0aCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERzdEluZm8oZGF0YSwgaXNTZXJ2ZXIpIHtcbiAgLy8gKy0tLS0rLS0tLS0rLS0tLS0tLSstLS0tLS0rLS0tLS0tLS0tLSstLS0tLS0tLS0tK1xuICAvLyB8VkVSIHwgQ01EIHwgIFJTViAgfCBBVFlQIHwgRFNULkFERFIgfCBEU1QuUE9SVCB8XG4gIC8vICstLS0tKy0tLS0tKy0tLS0tLS0rLS0tLS0tKy0tLS0tLS0tLS0rLS0tLS0tLS0tLStcbiAgLy8gfCAxICB8ICAxICB8IFgnMDAnIHwgIDEgICB8IFZhcmlhYmxlIHwgICAgMiAgICAgfFxuICAvLyArLS0tLSstLS0tLSstLS0tLS0tKy0tLS0tLSstLS0tLS0tLS0tKy0tLS0tLS0tLS0rXG4gIC8vIFlldCBiZWdpbiB3aXRoIEFUWVAuXG5cbiAgY29uc3Qgb2Zmc2V0ID0gaXNTZXJ2ZXIgPyAwIDogMztcbiAgcmV0dXJuIHBhcnNlRHN0SW5mbyhkYXRhLCBvZmZzZXQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RHN0SW5mb0Zyb21VRFBNc2coZGF0YSwgaXNTZXJ2ZXIpIHtcbiAgLy8gKy0tLS0rLS0tLS0tKy0tLS0tLSstLS0tLS0tLS0tKy0tLS0tLS0tLS0rLS0tLS0tLS0tLStcbiAgLy8gfFJTViB8IEZSQUcgfCBBVFlQIHwgRFNULkFERFIgfCBEU1QuUE9SVCB8ICAgREFUQSAgIHxcbiAgLy8gKy0tLS0rLS0tLS0tKy0tLS0tLSstLS0tLS0tLS0tKy0tLS0tLS0tLS0rLS0tLS0tLS0tLStcbiAgLy8gfCAyICB8ICAxICAgfCAgMSAgIHwgVmFyaWFibGUgfCAgICAyICAgICB8IFZhcmlhYmxlIHxcbiAgLy8gKy0tLS0rLS0tLS0tKy0tLS0tLSstLS0tLS0tLS0tKy0tLS0tLS0tLS0rLS0tLS0tLS0tLStcblxuICBjb25zdCBvZmZzZXQgPSBpc1NlcnZlciA/IDAgOiAzO1xuXG4gIHJldHVybiBwYXJzZURzdEluZm8oZGF0YSwgb2Zmc2V0KTtcbn1cblxuY29uc3QgZm9ybWF0S2V5VmFsdWVzID0ge1xuICBzZXJ2ZXI6ICdzZXJ2ZXJBZGRyJyxcbiAgc2VydmVyX3BvcnQ6ICdzZXJ2ZXJQb3J0JyxcbiAgbG9jYWxfYWRkcjogJ2xvY2FsQWRkcicsXG4gIGxvY2FsX3BvcnQ6ICdsb2NhbFBvcnQnLFxuICBsb2NhbF9hZGRyX2lwdjY6ICdsb2NhbEFkZHJJUHY2JyxcbiAgc2VydmVyX2FkZHJfaXB2NjogJ3NlcnZlckFkZHJJUHY2Jyxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDb25maWcoX2NvbmZpZykge1xuICBjb25zdCBmb3JtYXR0ZWRDb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCBfY29uZmlnKTtcblxuICBPYmplY3Qua2V5cyhmb3JtYXRLZXlWYWx1ZXMpLmZvckVhY2goKGtleSkgPT4ge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZvcm1hdHRlZENvbmZpZywga2V5KSkge1xuICAgICAgZm9ybWF0dGVkQ29uZmlnW2Zvcm1hdEtleVZhbHVlc1trZXldXSA9IGZvcm1hdHRlZENvbmZpZ1trZXldO1xuICAgICAgZGVsZXRlIGZvcm1hdHRlZENvbmZpZ1trZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGZvcm1hdHRlZENvbmZpZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERzdFN0cihkc3RJbmZvKSB7XG4gIGlmICghZHN0SW5mbykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgc3dpdGNoIChkc3RJbmZvLmF0eXApIHtcbiAgICBjYXNlIDE6XG4gICAgY2FzZSA0OlxuICAgICAgcmV0dXJuIGAke2lwLnRvU3RyaW5nKGRzdEluZm8uZHN0QWRkcil9OiR7ZHN0SW5mby5kc3RQb3J0LnJlYWRVSW50MTZCRSgpfWA7XG4gICAgY2FzZSAzOlxuICAgICAgcmV0dXJuIGAke2RzdEluZm8uZHN0QWRkci50b1N0cmluZygndXRmOCcpfToke2RzdEluZm8uZHN0UG9ydC5yZWFkVUludDE2QkUoKX1gO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJ1dBUk46IGludmFsaWQgYXR5cCc7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByZWZpeGVkQXJnTmFtZShuYW1lKSB7XG4gIHJldHVybiBuYW1lLmxlbmd0aCA9PT0gMSA/IGAtJHtuYW1lfWAgOiBgLS0ke25hbWV9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9iajJBcmd2KG9iaikge1xuICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdCBhbiBvYmplY3Qgd2hlbiBzdHJpbmdpZnkgdG8gYXJndicpO1xuICB9XG5cbiAgbGV0IGFyZ3YgPSAnJztcblxuICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICBjb25zdCBhcmdOYW1lID0gZ2V0UHJlZml4ZWRBcmdOYW1lKG5hbWUpO1xuICAgIGNvbnN0IHZhbHVlID0gb2JqW25hbWVdO1xuICAgIGxldCBhcmdWYWx1ZSA9ICcnO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXJnVmFsdWUgPSBTdHJpbmcodmFsdWUpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcnRzID0gYXJnVmFsdWUubGVuZ3RoID4gMCA/IGAke2FyZ05hbWV9ICR7YXJnVmFsdWV9YCA6IGAke2FyZ05hbWV9YDtcblxuICAgIGFyZ3YgPSBgJHthcmd2fSAke3BhcnRzfWA7XG4gIH0pO1xuXG4gIHJldHVybiBhcmd2O1xufVxuIl19