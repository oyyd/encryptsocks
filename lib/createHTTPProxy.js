'use strict';

exports.__esModule = true;
exports.default = createHTTPProxy;

var _http = require('http');

var _socks = require('socks');

var _socks2 = _interopRequireDefault(_socks);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NAME = 'httpProxy';

var logger = void 0;

function createSocksOptions(_ref, host, port) {
  var localAddr = _ref.localAddr;
  var localPort = _ref.localPort;

  return {
    proxy: {
      ipaddress: localAddr,
      port: localPort,
      type: 5
    },
    target: {
      host: host, port: port
    },
    command: 'connect'
  };
}

function getPort(host) {
  return ~host.indexOf(':') ? parseInt(host.slice(host.indexOf(':') + 1), 10) : 80;
}

function getHostFromURL(url) {
  var delimerIndex = url.indexOf(':');
  return ~delimerIndex ? url.slice(0, delimerIndex) : url;
}

function parseHead(chunk) {
  var head = chunk.toString('utf8');
  var hostIndex = head.indexOf('Host: ');
  var method = head.slice(0, head.indexOf(' '));
  var host = head.slice(hostIndex + 6, head.indexOf('\r\n', hostIndex));
  var port = getPort(host);
  host = getHostFromURL(host);

  return {
    method: method, host: host, port: port
  };
}

function createSocksRequest(config, _ref2, cliSocket, chunk) {
  var host = _ref2.host;
  var port = _ref2.port;
  var method = _ref2.method;

  _socks2.default.createConnection(createSocksOptions(config, host, port), function (err, sslocal) {
    if (err) {
      logger.warn(NAME + ' get error while create socks request: ' + err.message);
      return;
    }

    if (method === 'CONNECT') {
      cliSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    } else {
      sslocal.write(chunk);
    }

    // TODO:
    cliSocket.pipe(sslocal, { end: false });
    sslocal.pipe(cliSocket, { end: false });

    sslocal.resume();
    cliSocket.resume();
  });
}

function createHTTPProxy(config, _logger) {
  logger = _logger;

  var server = (0, _http.createServer)().listen(config.HTTPProxyPort);

  server.on('connect', function (req, socket, chunk) {
    // proxy with 'connect' method
    logger.debug(NAME + ' type: CONNECT');

    var reqInfo = {
      host: req.url,
      port: getPort(req.url),
      method: 'CONNECT'
    };

    createSocksRequest(config, reqInfo, socket, chunk);
  });

  server.on('connection', function (socket) {
    socket.once('data', function (chunk) {
      // socket.pause();
      var reqInfo = parseHead(chunk);

      if (reqInfo.method !== 'CONNECT') {
        // proxy without 'connect' method
        createSocksRequest(config, reqInfo, socket, chunk);
      }
    });

    socket.on('error', function (err) {
      logger.error(NAME + ' socket get error: ' + err.stack);
    });
  });

  // TODO: handle error

  return {
    server: server,
    close: _utils.closeSilently.bind(null, server)
  };
}