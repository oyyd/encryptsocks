import ip from 'ip';
import { createServer as _createServer, connect } from 'net';
import { getDstInfo, writeOrPause, getDstStr, closeSilently,
  createSafeAfterHandler } from './utils';
import { createLogger, LOG_NAMES } from './logger';
import { createCipher, createDecipher } from './encryptor';
import { createPACServer } from './pacServer';
import createUDPRelay from './createUDPRelay';
import { createAuthInfo, validate } from './auth';

const NAME = 'ss_local';

let logger;

function handleMethod(connection, data, authInfo) {
  // +----+----------+----------+
  // |VER | NMETHODS | METHODS  |
  // +----+----------+----------+
  // | 1  |    1     | 1 to 255 |
  // +----+----------+----------+
  const { forceAuth } = authInfo;
  const buf = new Buffer(2);

  let method = -1;

  if (forceAuth && data.indexOf(0x02, 2) >= 0) {
    method = 2;
  }

  if (!forceAuth && data.indexOf(0x00, 2) >= 0) {
    method = 0;
  }

  // allow `no authetication` or any usename/password
  if (method === -1) {
    // logger.warn(`unsupported method: ${data.toString('hex')}`);
    buf.writeUInt16BE(0x05FF);
    connection.write(buf);
    connection.end();
    return -1;
  }

  buf.writeUInt16BE(0x0500);
  connection.write(buf);

  return method === 0 ? 1 : 3;
}

function fetchUsernamePassword(data) {
  // suppose all VER is 0x01
  if (!(data instanceof Buffer)) {
    return null;
  }

  const ulen = data[1];
  const username = data.slice(2, ulen + 2).toString('ascii');
  const plenStart = ulen + 2;
  const plen = data[plenStart];
  const password = data.slice(plenStart + 1, plenStart + 1 + plen).toString('ascii');

  return { username, password };
}

function responseAuth(success, connection) {
  const buf = new Buffer(2);
  const toWrite = success ? 0x0100 : 0x0101;
  const nextProcedure = success ? 2 : -1;

  buf.writeUInt16BE(toWrite);
  connection.write(buf);
  connection.end();

  return nextProcedure;
}

export function usernamePasswordAuthetication(connection, data, authInfo) {
  // +----+------+----------+------+----------+
  // |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
  // +----+------+----------+------+----------+
  // | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
  // +----+------+----------+------+----------+

  const usernamePassword = fetchUsernamePassword(data);

  if (!usernamePassword) {
    return responseAuth(false, connection);
  }

  const { username, password } = usernamePassword;

  if (!validate(authInfo, username, password)) {
    return responseAuth(false, connection);
  }

  return responseAuth(true, connection);
}

function handleRequest(
  connection, data,
  { serverAddr, serverPort, password, method, localAddr, localPort,
    localAddrIPv6 },
  dstInfo, onConnect, onDestroy, isClientConnected
) {
  const cmd = data[1];
  const clientOptions = {
    port: serverPort,
    host: serverAddr,
  };
  const isUDPRelay = (cmd === 0x03);

  let repBuf;
  let tmp = null;
  let decipher = null;
  let decipheredData = null;
  let cipher = null;
  let cipheredData = null;

  if (cmd !== 0x01 && !isUDPRelay) {
    logger.warn(`unsupported cmd: ${cmd}`);
    return {
      stage: -1,
    };
  }

  // prepare data

  // +----+-----+-------+------+----------+----------+
  // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+

  if (isUDPRelay) {
    const isUDP4 = dstInfo.atyp === 1;

    repBuf = new Buffer(4);
    repBuf.writeUInt32BE(isUDP4 ? 0x05000001 : 0x05000004);
    tmp = new Buffer(2);
    tmp.writeUInt16BE(localPort);
    repBuf = Buffer.concat([repBuf, ip.toBuffer(isUDP4 ? localAddr : localAddrIPv6), tmp]);

    connection.write(repBuf);

    return {
      stage: -1,
    };
  }

  logger.verbose(`connecting: ${dstInfo.dstAddr.toString('utf8')}`
    + `:${dstInfo.dstPort.readUInt16BE()}`);

  repBuf = new Buffer(10);
  repBuf.writeUInt32BE(0x05000001);
  repBuf.writeUInt32BE(0x00000000, 4, 4);
  repBuf.writeUInt16BE(0, 8, 2);

  tmp = createCipher(password, method,
    data.slice(3)); // skip VER, CMD, RSV
  cipher = tmp.cipher;
  cipheredData = tmp.data;

  // connect
  const clientToRemote = connect(clientOptions, () => {
    onConnect();
  });

  clientToRemote.on('data', (remoteData) => {
    if (!decipher) {
      tmp = createDecipher(password, method, remoteData);
      if (!tmp) {
        logger.warn(`${NAME} get invalid msg`);
        onDestroy();
        return;
      }
      decipher = tmp.decipher;
      decipheredData = tmp.data;
    } else {
      decipheredData = decipher.update(remoteData);
    }

    if (isClientConnected()) {
      writeOrPause(clientToRemote, connection, decipheredData);
    } else {
      clientToRemote.destroy();
    }
  });

  clientToRemote.on('drain', () => {
    connection.resume();
  });

  clientToRemote.on('end', () => {
    connection.end();
  });

  clientToRemote.on('error', (e) => {
    logger.warn('ssLocal error happened in clientToRemote when'
      + ` connecting to ${getDstStr(dstInfo)}: ${e.message}`);

    onDestroy();
  });

  clientToRemote.on('close', (e) => {
    if (e) {
      connection.destroy();
    } else {
      connection.end();
    }
  });

  // write
  connection.write(repBuf);

  writeOrPause(connection, clientToRemote, cipheredData);

  return {
    stage: 2,
    cipher,
    clientToRemote,
  };
}

function handleConnection(config, connection) {
  const { authInfo } = config;

  let stage = 0;
  let clientToRemote;
  let tmp;
  let cipher;
  let dstInfo;
  let remoteConnected = false;
  let clientConnected = true;
  let timer = null;

  connection.on('data', (data) => {
    switch (stage) {
      case 0:
        stage = handleMethod(connection, data, authInfo);

        break;
      case 1:
        dstInfo = getDstInfo(data);

        if (!dstInfo) {
          logger.warn(`Failed to get 'dstInfo' from parsing data: ${data}`);
          connection.destroy();
          return;
        }

        tmp = handleRequest(
          connection, data, config, dstInfo,
          () => {
            // after connected
            remoteConnected = true;
          },
          () => {
            // get invalid msg or err happened
            if (remoteConnected) {
              remoteConnected = false;
              clientToRemote.destroy();
            }

            if (clientConnected) {
              clientConnected = false;
              connection.destroy();
            }
          },
          () => clientConnected
        );

        stage = tmp.stage;

        if (stage === 2) {
          clientToRemote = tmp.clientToRemote;
          cipher = tmp.cipher;
        } else {
          // udp relay
          clientConnected = false;
          connection.end();
        }

        break;
      case 2:
        tmp = cipher.update(data);

        writeOrPause(connection, clientToRemote, tmp);

        break;
      case 3:
        // rfc 1929 username/password authetication
        stage = usernamePasswordAuthetication(connection, data, authInfo);
        break;
      default:
    }
  });

  connection.on('drain', () => {
    if (remoteConnected) {
      clientToRemote.resume();
    }
  });

  connection.on('end', () => {
    clientConnected = false;
    if (remoteConnected) {
      clientToRemote.end();
    }
  });

  connection.on('close', (e) => {
    if (timer) {
      clearTimeout(timer);
    }

    clientConnected = false;

    if (remoteConnected) {
      if (e) {
        clientToRemote.destroy();
      } else {
        clientToRemote.end();
      }
    }
  });

  connection.on('error', (e) => {
    logger.warn(`${NAME} error happened in client connection: ${e.message}`);
  });

  timer = setTimeout(() => {
    if (clientConnected) {
      connection.destroy();
    }

    if (remoteConnected) {
      clientToRemote.destroy();
    }
  }, config.timeout * 1000);
}

function closeAll() {
  closeSilently(this.server);
  closeSilently(this.pacServer);

  this.udpRelay.close();

  if (this.httpProxyServer) {
    this.httpProxyServer.close();
  }
}

function createServer(config) {
  const server = _createServer(handleConnection.bind(null, config));
  const udpRelay = createUDPRelay(config, false, logger);
  const pacServer = createPACServer(config, logger);

  server.on('close', () => {
    logger.warn(`${NAME} server closed`);
  });

  server.on('error', (e) => {
    logger.error(`${NAME} server error: ${e.message}`);
  });

  server.listen(config.localPort);

  logger.verbose(`${NAME} is listening on ${config.localAddr}:${config.localPort}`);

  return {
    server,
    udpRelay,
    pacServer,
    closeAll,
  };
}

// eslint-disable-next-line
export function startServer(config, willLogToConsole = false) {
  logger = logger || createLogger(config.level, LOG_NAMES.LOCAL, willLogToConsole);

  const { info, warn, error } = createAuthInfo(config);

  if (error) {
    logger.error(`${NAME} error: ${error}`);
    return null;
  }

  if (warn) {
    logger.warn(`${NAME}: ${warn}`);
  }

  return createServer(Object.assign({}, config, {
    authInfo: info,
  }));
}

if (module === require.main) {
  process.on('message', (config) => {
    logger = createLogger(config.level, LOG_NAMES.LOCAL, false);
    startServer(config, false);
  });

  process.on('uncaughtException', (err) => {
    logger.error(`${NAME} uncaughtException: ${err.stack} `, createSafeAfterHandler(logger, () => {
      process.exit(1);
    }));
  });
}
