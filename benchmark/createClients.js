const http = require('http');
const { parse } = require('url');
const { timesLimit } = require('async');
const { PORT, RESPONSE } = require('./createResourceServer');
const { request } = require('socks5-http-client');
const { baseLine, limitConnections, timeout, _resourceAddr } = require('./config');
const { ERROR_TYPES } = require('./conclude');

const SOCKS_PORT = 1080;

const HOST = _resourceAddr || '127.0.0.1';
const URL = `http://${HOST}:${PORT}`;

function getStartTimePoint() {
  return process.hrtime();
}

function composeData(time) {
  // millisecond
  return process.hrtime(time)[0] * 1e3 + process.hrtime(time)[1] / 1000000;
}

function handler(time, onEnd, incomingMsg) {
  let body = null;

  incomingMsg.on('data', data => {
    body = !body ? data : Buffer.concat([body, data]);
  });

  incomingMsg.on('end', () => {
    let err = null;

    // assume it's successful if they have the
    // same length
    if (body.length !== RESPONSE.length) {
      err = ERROR_TYPES.UNEXPECTED;
    }

    onEnd(null, {
      err,
      time: composeData(time),
    });
  });

  incomingMsg.on('error', err => {
    onEnd(null, {
      err,
      time: null,
    });
  });
}

function _send(options, index, next) {
  let req = null;
  let isTimeout = false;
  let err = null;
  let result = null;
  let isSocketConnected = false;

  const time = getStartTimePoint();
  const _handler = handler.bind(null, time, (_err, _result) => {
    err = _err;
    result = _result;
  });

  if (baseLine) {
    req = http.request(options, _handler);
  } else {
    req = request(options, _handler);
  }

  // req.once('socket', socket => {
  //   socket.on('connect', () => {
  //     isSocketConnected = true;
  //   });
  // });

  req.setTimeout(timeout, () => {
    isTimeout = true;
    // if (!isSocketConnected) {
    //   console.log('idle');
    // }
    err = null;
    result = {
      err: ERROR_TYPES.TIMEOUT,
    };
    req.destroy();
  });

  req.on('error', () => {
    err = null;
    result = {
      err: ERROR_TYPES.UNEXPECTED,
    };
  });

  req.on('close', () => {
    next(err, result || {
      err: ERROR_TYPES.UNEXPECTED,
    });
  });

  req.end();

  return req;
}

function send(t, next) {
  const options = Object.assign({}, parse(URL), {
    socksPort: SOCKS_PORT,
  });

  // NOTE:
  if (~options.host.indexOf(':')) {
    options.host = options.host.slice(0, options.host.indexOf(':'));
  }

  const _sendToTarget = _send.bind(null, options);

  // TODO: findout why we have to limit
  timesLimit(t, limitConnections, _sendToTarget, next);
}

module.exports = {
  send, SOCKS_PORT,
};
