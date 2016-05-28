import { createServer } from 'http';
import Socks from 'socks';

import { closeSilently } from './utils';

const NAME = 'httpProxy';

let logger;

function createSocksOptions({ localAddr, localPort }, host, port) {
  return {
    proxy: {
      ipaddress: localAddr,
      port: localPort,
      type: 5,
    },
    target: {
      host, port,
    },
    command: 'connect',
  };
}

function getPort(host) {
  return ~host.indexOf(':') ? parseInt(host.slice(host.indexOf(':') + 1), 10) : 80;
}

function getHostFromURL(url) {
  const delimerIndex = url.indexOf(':');
  return ~delimerIndex ? url.slice(0, delimerIndex) : url;
}

function parseHead(chunk) {
  const head = chunk.toString('utf8');
  const hostIndex = head.indexOf('Host: ');
  const method = head.slice(0, head.indexOf(' '));
  let host = head.slice(hostIndex + 6, head.indexOf('\r\n', hostIndex));
  const port = getPort(host);
  host = getHostFromURL(host);

  return {
    method, host, port,
  };
}

function createSocksRequest(config, { host, port, method }, cliSocket, chunk) {
  Socks.createConnection(createSocksOptions(config, host, port), (err, sslocal) => {
    if (err) {
      logger.warn(`${NAME} get error while create socks request: ${err.message}`);
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

export default function createHTTPProxy(config, _logger) {
  logger = _logger;

  const server = createServer().listen(config.HTTPProxyPort);

  server.on('connect', (req, socket, chunk) => {
    // proxy with 'connect' method
    logger.debug(`${NAME} type: CONNECT`);

    const reqInfo = {
      host: req.url,
      port: getPort(req.url),
      method: 'CONNECT',
    };

    createSocksRequest(config, reqInfo, socket, chunk);
  });

  server.on('connection', socket => {
    socket.once('data', chunk => {
      // socket.pause();
      const reqInfo = parseHead(chunk);

      if (reqInfo.method !== 'CONNECT') {
        // proxy without 'connect' method
        createSocksRequest(config, reqInfo, socket, chunk);
      }
    });

    socket.on('error', err => {
      logger.error(`${NAME} socket get error: ${err.stack}`);
    });
  });

  // TODO: handle error

  return {
    server,
    close: closeSilently.bind(null, server),
  };
}
