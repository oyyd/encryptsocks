'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.createAuthInfo = createAuthInfo;
exports.validate = validate;
function createAuthInfo(config) {
  var auth = config.auth;

  var info = {
    forceAuth: false
  };

  if (auth && auth.forceAuth) {
    info.forceAuth = true;
  }

  if (!info.forceAuth) {
    return {
      info: info
    };
  }

  var usernamePassword = auth.usernamePassword;


  if (!usernamePassword || (typeof usernamePassword === 'undefined' ? 'undefined' : _typeof(usernamePassword)) !== 'object') {
    return {
      info: info,
      error: 'expect "usernamePassword" in your config file to be an object'
    };
  }

  var keys = Object.keys(usernamePassword);

  if (keys.length === 0) {
    return {
      info: info,
      warn: 'no valid username/password found in your config file'
    };
  }

  info.usernamePassword = usernamePassword;

  return {
    info: info
  };
}

function validate(info, username, password) {
  return info.usernamePassword[username] === password;
}