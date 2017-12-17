'use strict';

exports.__esModule = true;
exports.DAEMON_COMMAND = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.stringifyProxyOptions = stringifyProxyOptions;
exports.resolveServerAddr = resolveServerAddr;
exports.getDefaultProxyOptions = getDefaultProxyOptions;
exports.getConfig = getConfig;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _ip = require('ip');

var _dns = require('dns');

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _fs = require('fs');

var _defaultConfig = require('./defaultConfig');

var _defaultConfig2 = _interopRequireDefault(_defaultConfig);

var _config = require('../config.json');

var _config2 = _interopRequireDefault(_config);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DAEMON_COMMAND = exports.DAEMON_COMMAND = {
  start: 'start',
  stop: 'stop',
  restart: 'restart'
};

var PROXY_ARGUMENT_PAIR = {
  c: 'configFilePath',
  s: 'serverAddr',
  p: 'serverPort',
  pac_port: 'pacServerPort',
  l: 'localAddr',
  b: 'localPort',
  k: 'password',
  m: 'method',
  t: 'timeout',
  level: 'level',
  log_path: 'logPath',
  // private
  mem: '_recordMemoryUsage'
};

var PROXY_ARGUMENT_EXTRAL_KEYS = ['localAddrIPv6', 'serverAddrIPv6', '_recordMemoryUsage'];

var GENERAL_ARGUMENT_PAIR = {
  h: 'help',
  help: 'help',
  d: 'daemon',
  pac_update_gfwlist: 'pacUpdateGFWList'
};

function getProxyOptionArgName(optionName) {
  // ignore these keys
  if (PROXY_ARGUMENT_EXTRAL_KEYS.indexOf(optionName) >= 0) {
    return null;
  }

  var result = Object.keys(PROXY_ARGUMENT_PAIR).find(function (item) {
    return PROXY_ARGUMENT_PAIR[item] === optionName;
  });

  if (!result) {
    throw new Error('invalid optionName: "' + optionName + '"');
  }

  return result;
}

function stringifyProxyOptions(proxyOptions) {
  if ((typeof proxyOptions === 'undefined' ? 'undefined' : _typeof(proxyOptions)) !== 'object') {
    throw new Error('invalid type of "proxyOptions"');
  }

  var args = [];

  Object.keys(proxyOptions).forEach(function (optionName) {
    var value = proxyOptions[optionName];
    var argName = getProxyOptionArgName(optionName);

    if (!argName) {
      return;
    }

    args.push((0, _utils.getPrefixedArgName)(argName), value);
  });

  return args.join(' ');
}

function getArgvOptions(argv) {
  var generalOptions = {};
  var proxyOptions = {};
  var configPair = (0, _minimist2.default)(argv);
  var optionsType = [{
    options: proxyOptions,
    keys: Object.keys(PROXY_ARGUMENT_PAIR),
    values: PROXY_ARGUMENT_PAIR
  }, {
    options: generalOptions,
    keys: Object.keys(GENERAL_ARGUMENT_PAIR),
    values: GENERAL_ARGUMENT_PAIR
  }];

  var invalidOption = null;

  Object.keys(configPair).forEach(function (key) {
    if (key === '_') {
      return;
    }

    var hit = false;

    optionsType.forEach(function (optType) {
      var i = optType.keys.indexOf(key);

      if (i >= 0) {
        optType.options[optType.values[optType.keys[i]]] = configPair[key]; // eslint-disable-line
        hit = true;
      }
    });

    if (!hit) {
      invalidOption = key;
    }
  });

  if (invalidOption) {
    invalidOption = invalidOption.length === 1 ? '-' + invalidOption : '--' + invalidOption;
  } else if (generalOptions.daemon && Object.keys(DAEMON_COMMAND).indexOf(generalOptions.daemon) < 0) {
    invalidOption = 'invalid daemon command: ' + generalOptions.daemon;
  }

  if (proxyOptions.logPath && !_path2.default.isAbsolute(proxyOptions.logPath)) {
    proxyOptions.logPath = _path2.default.resolve(process.cwd(), proxyOptions.logPath);
  }

  return {
    generalOptions: generalOptions, proxyOptions: proxyOptions, invalidOption: invalidOption
  };
}

function readConfig(_filePath) {
  if (!_filePath) {
    return null;
  }

  var filePath = _path2.default.resolve(process.cwd(), _filePath);

  try {
    (0, _fs.accessSync)(filePath);
  } catch (e) {
    throw new Error('failed to find config file in: ' + filePath);
  }

  return JSON.parse((0, _fs.readFileSync)(filePath));
}

/**
 * Transform domain && ipv6 to ipv4.
 */
function resolveServerAddr(config, next) {
  var serverAddr = config.proxyOptions.serverAddr;


  if ((0, _ip.isV4Format)(serverAddr)) {
    next(null, config);
  } else {
    (0, _dns.lookup)(serverAddr, function (err, addresses) {
      if (err) {
        next(new Error('failed to resolve \'serverAddr\': ' + serverAddr), config);
      } else {
        // NOTE: mutate data
        config.proxyOptions.serverAddr = addresses; // eslint-disable-line
        next(null, config);
      }
    });
  }
}

function getDefaultProxyOptions() {
  return Object.assign({}, _defaultConfig2.default);
}

function getConfig() {
  var argv = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var arg1 = arguments[1];
  var arg2 = arguments[2];

  var doNotResolveIpv6 = arg1;
  var next = arg2;

  if (!arg2) {
    doNotResolveIpv6 = false;
    next = arg1;
  }

  var _getArgvOptions = getArgvOptions(argv),
      generalOptions = _getArgvOptions.generalOptions,
      proxyOptions = _getArgvOptions.proxyOptions,
      invalidOption = _getArgvOptions.invalidOption;

  var specificFileConfig = readConfig(proxyOptions.configFilePath) || _config2.default;
  var config = {
    generalOptions: generalOptions,
    invalidOption: invalidOption,
    proxyOptions: Object.assign({}, _defaultConfig2.default, specificFileConfig, proxyOptions)
  };

  if (doNotResolveIpv6) {
    next(null, config);
    return;
  }

  resolveServerAddr(config, next);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25maWcuanMiXSwibmFtZXMiOlsic3RyaW5naWZ5UHJveHlPcHRpb25zIiwicmVzb2x2ZVNlcnZlckFkZHIiLCJnZXREZWZhdWx0UHJveHlPcHRpb25zIiwiZ2V0Q29uZmlnIiwiREFFTU9OX0NPTU1BTkQiLCJzdGFydCIsInN0b3AiLCJyZXN0YXJ0IiwiUFJPWFlfQVJHVU1FTlRfUEFJUiIsImMiLCJzIiwicCIsInBhY19wb3J0IiwibCIsImIiLCJrIiwibSIsInQiLCJsZXZlbCIsImxvZ19wYXRoIiwibWVtIiwiUFJPWFlfQVJHVU1FTlRfRVhUUkFMX0tFWVMiLCJHRU5FUkFMX0FSR1VNRU5UX1BBSVIiLCJoIiwiaGVscCIsImQiLCJwYWNfdXBkYXRlX2dmd2xpc3QiLCJnZXRQcm94eU9wdGlvbkFyZ05hbWUiLCJvcHRpb25OYW1lIiwiaW5kZXhPZiIsInJlc3VsdCIsIk9iamVjdCIsImtleXMiLCJmaW5kIiwiaXRlbSIsIkVycm9yIiwicHJveHlPcHRpb25zIiwiYXJncyIsImZvckVhY2giLCJ2YWx1ZSIsImFyZ05hbWUiLCJwdXNoIiwiam9pbiIsImdldEFyZ3ZPcHRpb25zIiwiYXJndiIsImdlbmVyYWxPcHRpb25zIiwiY29uZmlnUGFpciIsIm9wdGlvbnNUeXBlIiwib3B0aW9ucyIsInZhbHVlcyIsImludmFsaWRPcHRpb24iLCJrZXkiLCJoaXQiLCJvcHRUeXBlIiwiaSIsImxlbmd0aCIsImRhZW1vbiIsImxvZ1BhdGgiLCJpc0Fic29sdXRlIiwicmVzb2x2ZSIsInByb2Nlc3MiLCJjd2QiLCJyZWFkQ29uZmlnIiwiX2ZpbGVQYXRoIiwiZmlsZVBhdGgiLCJlIiwiSlNPTiIsInBhcnNlIiwiY29uZmlnIiwibmV4dCIsInNlcnZlckFkZHIiLCJlcnIiLCJhZGRyZXNzZXMiLCJhc3NpZ24iLCJhcmcxIiwiYXJnMiIsImRvTm90UmVzb2x2ZUlwdjYiLCJzcGVjaWZpY0ZpbGVDb25maWciLCJjb25maWdGaWxlUGF0aCJdLCJtYXBwaW5n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QkFBbUJGLElBQXZCO0FBQ0EsTUFBSUwsT0FBT00sSUFBWDs7QUFFQSxNQUFJLENBQUNBLElBQUwsRUFBVztBQUNUQyx1QkFBbUIsS0FBbkI7QUFDQVAsV0FBT0ssSUFBUDtBQUNEOztBQVA4Qyx3QkFTUy9CLGVBQWVDLElBQWYsQ0FUVDtBQUFBLE1BU3ZDQyxjQVR1QyxtQkFTdkNBLGNBVHVDO0FBQUEsTUFTdkJULFlBVHVCLG1CQVN2QkEsWUFUdUI7QUFBQSxNQVNUYyxhQVRTLG1CQVNUQSxhQVRTOztBQVUvQyxNQUFNMkIscUJBQXFCZixXQUFXMUIsYUFBYTBDLGNBQXhCLHFCQUEzQjtBQUNBLE1BQU1WLFNBQVM7QUFDYnZCLGtDQURhO0FBRWJLLGdDQUZhO0FBR2JkLGtCQUFjTCxPQUFPMEMsTUFBUCxDQUFjLEVBQWQsMkJBQWtDSSxrQkFBbEMsRUFBc0R6QyxZQUF0RDtBQUhELEdBQWY7O0FBTUEsTUFBSXdDLGdCQUFKLEVBQXNCO0FBQ3BCUCxTQUFLLElBQUwsRUFBV0QsTUFBWDtBQUNBO0FBQ0Q7O0FBRURuRSxvQkFBa0JtRSxNQUFsQixFQUEwQkMsSUFBMUI7QUFDRCIsImZpbGUiOiJjb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzVjRGb3JtYXQgfSBmcm9tICdpcCc7XG5pbXBvcnQgeyBsb29rdXAgfSBmcm9tICdkbnMnO1xuaW1wb3J0IG1pbmltaXN0IGZyb20gJ21pbmltaXN0JztcbmltcG9ydCB7IHJlYWRGaWxlU3luYywgYWNjZXNzU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCBERUZBVUxUX0NPTkZJRyBmcm9tICcuL2RlZmF1bHRDb25maWcnO1xuaW1wb3J0IGZpbGVDb25maWcgZnJvbSAnLi4vY29uZmlnLmpzb24nO1xuaW1wb3J0IHsgZ2V0UHJlZml4ZWRBcmdOYW1lIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCBEQUVNT05fQ09NTUFORCA9IHtcbiAgc3RhcnQ6ICdzdGFydCcsXG4gIHN0b3A6ICdzdG9wJyxcbiAgcmVzdGFydDogJ3Jlc3RhcnQnLFxufTtcblxuY29uc3QgUFJPWFlfQVJHVU1FTlRfUEFJUiA9IHtcbiAgYzogJ2NvbmZpZ0ZpbGVQYXRoJyxcbiAgczogJ3NlcnZlckFkZHInLFxuICBwOiAnc2VydmVyUG9ydCcsXG4gIHBhY19wb3J0OiAncGFjU2VydmVyUG9ydCcsXG4gIGw6ICdsb2NhbEFkZHInLFxuICBiOiAnbG9jYWxQb3J0JyxcbiAgazogJ3Bhc3N3b3JkJyxcbiAgbTogJ21ldGhvZCcsXG4gIHQ6ICd0aW1lb3V0JyxcbiAgbGV2ZWw6ICdsZXZlbCcsXG4gIGxvZ19wYXRoOiAnbG9nUGF0aCcsXG4gIC8vIHByaXZhdGVcbiAgbWVtOiAnX3JlY29yZE1lbW9yeVVzYWdlJyxcbn07XG5cbmNvbnN0IFBST1hZX0FSR1VNRU5UX0VYVFJBTF9LRVlTID0gW1xuICAnbG9jYWxBZGRySVB2NicsXG4gICdzZXJ2ZXJBZGRySVB2NicsXG4gICdfcmVjb3JkTWVtb3J5VXNhZ2UnLFxuXTtcblxuY29uc3QgR0VORVJBTF9BUkdVTUVOVF9QQUlSID0ge1xuICBoOiAnaGVscCcsXG4gIGhlbHA6ICdoZWxwJyxcbiAgZDogJ2RhZW1vbicsXG4gIHBhY191cGRhdGVfZ2Z3bGlzdDogJ3BhY1VwZGF0ZUdGV0xpc3QnLFxufTtcblxuZnVuY3Rpb24gZ2V0UHJveHlPcHRpb25BcmdOYW1lKG9wdGlvbk5hbWUpIHtcbiAgLy8gaWdub3JlIHRoZXNlIGtleXNcbiAgaWYgKFBST1hZX0FSR1VNRU5UX0VYVFJBTF9LRVlTLmluZGV4T2Yob3B0aW9uTmFtZSkgPj0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmtleXMoUFJPWFlfQVJHVU1FTlRfUEFJUilcbiAgICAuZmluZChpdGVtID0+IFBST1hZX0FSR1VNRU5UX1BBSVJbaXRlbV0gPT09IG9wdGlvbk5hbWUpO1xuXG4gIGlmICghcmVzdWx0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIG9wdGlvbk5hbWU6IFwiJHtvcHRpb25OYW1lfVwiYCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5UHJveHlPcHRpb25zKHByb3h5T3B0aW9ucykge1xuICBpZiAodHlwZW9mIHByb3h5T3B0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdHlwZSBvZiBcInByb3h5T3B0aW9uc1wiJyk7XG4gIH1cblxuICBjb25zdCBhcmdzID0gW107XG5cbiAgT2JqZWN0LmtleXMocHJveHlPcHRpb25zKS5mb3JFYWNoKChvcHRpb25OYW1lKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBwcm94eU9wdGlvbnNbb3B0aW9uTmFtZV07XG4gICAgY29uc3QgYXJnTmFtZSA9IGdldFByb3h5T3B0aW9uQXJnTmFtZShvcHRpb25OYW1lKTtcblxuICAgIGlmICghYXJnTmFtZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGFyZ3MucHVzaChnZXRQcmVmaXhlZEFyZ05hbWUoYXJnTmFtZSksIHZhbHVlKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGFyZ3Muam9pbignICcpO1xufVxuXG5mdW5jdGlvbiBnZXRBcmd2T3B0aW9ucyhhcmd2KSB7XG4gIGNvbnN0IGdlbmVyYWxPcHRpb25zID0ge307XG4gIGNvbnN0IHByb3h5T3B0aW9ucyA9IHt9O1xuICBjb25zdCBjb25maWdQYWlyID0gbWluaW1pc3QoYXJndik7XG4gIGNvbnN0IG9wdGlvbnNUeXBlID0gW3tcbiAgICBvcHRpb25zOiBwcm94eU9wdGlvbnMsXG4gICAga2V5czogT2JqZWN0LmtleXMoUFJPWFlfQVJHVU1FTlRfUEFJUiksXG4gICAgdmFsdWVzOiBQUk9YWV9BUkdVTUVOVF9QQUlSLFxuICB9LCB7XG4gICAgb3B0aW9uczogZ2VuZXJhbE9wdGlvbnMsXG4gICAga2V5czogT2JqZWN0LmtleXMoR0VORVJBTF9BUkdVTUVOVF9QQUlSKSxcbiAgICB2YWx1ZXM6IEdFTkVSQUxfQVJHVU1FTlRfUEFJUixcbiAgfV07XG5cbiAgbGV0IGludmFsaWRPcHRpb24gPSBudWxsO1xuXG4gIE9iamVjdC5rZXlzKGNvbmZpZ1BhaXIpLmZvckVhY2goKGtleSkgPT4ge1xuICAgIGlmIChrZXkgPT09ICdfJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBoaXQgPSBmYWxzZTtcblxuICAgIG9wdGlvbnNUeXBlLmZvckVhY2goKG9wdFR5cGUpID0+IHtcbiAgICAgIGNvbnN0IGkgPSBvcHRUeXBlLmtleXMuaW5kZXhPZihrZXkpO1xuXG4gICAgICBpZiAoaSA+PSAwKSB7XG4gICAgICAgIG9wdFR5cGUub3B0aW9uc1tvcHRUeXBlLnZhbHVlc1tvcHRUeXBlLmtleXNbaV1dXSA9IGNvbmZpZ1BhaXJba2V5XTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICBoaXQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFoaXQpIHtcbiAgICAgIGludmFsaWRPcHRpb24gPSBrZXk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoaW52YWxpZE9wdGlvbikge1xuICAgIGludmFsaWRPcHRpb24gPSAoaW52YWxpZE9wdGlvbi5sZW5ndGggPT09IDEpID8gYC0ke2ludmFsaWRPcHRpb259YCA6IGAtLSR7aW52YWxpZE9wdGlvbn1gO1xuICB9IGVsc2UgaWYgKGdlbmVyYWxPcHRpb25zLmRhZW1vblxuICAgICYmIE9iamVjdC5rZXlzKERBRU1PTl9DT01NQU5EKS5pbmRleE9mKGdlbmVyYWxPcHRpb25zLmRhZW1vbikgPCAwKSB7XG4gICAgaW52YWxpZE9wdGlvbiA9IGBpbnZhbGlkIGRhZW1vbiBjb21tYW5kOiAke2dlbmVyYWxPcHRpb25zLmRhZW1vbn1gO1xuICB9XG5cbiAgaWYgKHByb3h5T3B0aW9ucy5sb2dQYXRoICYmICFwYXRoLmlzQWJzb2x1dGUocHJveHlPcHRpb25zLmxvZ1BhdGgpKSB7XG4gICAgcHJveHlPcHRpb25zLmxvZ1BhdGggPVxuICAgICAgcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIHByb3h5T3B0aW9ucy5sb2dQYXRoKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZ2VuZXJhbE9wdGlvbnMsIHByb3h5T3B0aW9ucywgaW52YWxpZE9wdGlvbixcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVhZENvbmZpZyhfZmlsZVBhdGgpIHtcbiAgaWYgKCFfZmlsZVBhdGgpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIF9maWxlUGF0aCk7XG5cbiAgdHJ5IHtcbiAgICBhY2Nlc3NTeW5jKGZpbGVQYXRoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgZmFpbGVkIHRvIGZpbmQgY29uZmlnIGZpbGUgaW46ICR7ZmlsZVBhdGh9YCk7XG4gIH1cblxuICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoZmlsZVBhdGgpKTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gZG9tYWluICYmIGlwdjYgdG8gaXB2NC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVTZXJ2ZXJBZGRyKGNvbmZpZywgbmV4dCkge1xuICBjb25zdCB7IHNlcnZlckFkZHIgfSA9IGNvbmZpZy5wcm94eU9wdGlvbnM7XG5cbiAgaWYgKGlzVjRGb3JtYXQoc2VydmVyQWRkcikpIHtcbiAgICBuZXh0KG51bGwsIGNvbmZpZyk7XG4gIH0gZWxzZSB7XG4gICAgbG9va3VwKHNlcnZlckFkZHIsIChlcnIsIGFkZHJlc3NlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBuZXh0KG5ldyBFcnJvcihgZmFpbGVkIHRvIHJlc29sdmUgJ3NlcnZlckFkZHInOiAke3NlcnZlckFkZHJ9YCksIGNvbmZpZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBOT1RFOiBtdXRhdGUgZGF0YVxuICAgICAgICBjb25maWcucHJveHlPcHRpb25zLnNlcnZlckFkZHIgPSBhZGRyZXNzZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgbmV4dChudWxsLCBjb25maWcpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0UHJveHlPcHRpb25zKCkge1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9DT05GSUcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnKGFyZ3YgPSBbXSwgYXJnMSwgYXJnMikge1xuICBsZXQgZG9Ob3RSZXNvbHZlSXB2NiA9IGFyZzE7XG4gIGxldCBuZXh0ID0gYXJnMjtcblxuICBpZiAoIWFyZzIpIHtcbiAgICBkb05vdFJlc29sdmVJcHY2ID0gZmFsc2U7XG4gICAgbmV4dCA9IGFyZzE7XG4gIH1cblxuICBjb25zdCB7IGdlbmVyYWxPcHRpb25zLCBwcm94eU9wdGlvbnMsIGludmFsaWRPcHRpb24gfSA9IGdldEFyZ3ZPcHRpb25zKGFyZ3YpO1xuICBjb25zdCBzcGVjaWZpY0ZpbGVDb25maWcgPSByZWFkQ29uZmlnKHByb3h5T3B0aW9ucy5jb25maWdGaWxlUGF0aCkgfHwgZmlsZUNvbmZpZztcbiAgY29uc3QgY29uZmlnID0ge1xuICAgIGdlbmVyYWxPcHRpb25zLFxuICAgIGludmFsaWRPcHRpb24sXG4gICAgcHJveHlPcHRpb25zOiBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX0NPTkZJRywgc3BlY2lmaWNGaWxlQ29uZmlnLCBwcm94eU9wdGlvbnMpLFxuICB9O1xuXG4gIGlmIChkb05vdFJlc29sdmVJcHY2KSB7XG4gICAgbmV4dChudWxsLCBjb25maWcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHJlc29sdmVTZXJ2ZXJBZGRyKGNvbmZpZywgbmV4dCk7XG59XG4iXX0=