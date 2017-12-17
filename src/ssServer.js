import ip from 'ip';
import { createServer as _createServer, connect } from 'net';
import { getDstInfo, writeOrPause, createSafeAfterHandler } from './utils';
import { createLogger, LOG_NAMES } from './logger';
import { createCipher, createDecipher } from './encryptor';
import createUDPRelay from './createUDPRelay';
// import { INTERVAL_TIME } from './recordMemoryUsage';
import { getConfig } from './config';

const NAME = 'ss_server';

let logger;

function createClientToDst(
  connection, data,
  password, method, onConnect, onDestroy, isLocalConnected
) {
  const dstInfo = getDstInfo(data, true);

  let cipher = null;
  let tmp;
  let cipheredData;
  let preservedData = null;

  if (!dstInfo) {
    logger.warn(`${NAME} receive invalid msg. `
      + 'local method/password doesn\'t accord with the server\'s?');
    return null;
  }

  const clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: (dstInfo.atyp === 3
      ? dstInfo.dstAddr.toString('ascii') : ip.toString(dstInfo.dstAddr)),
  };

  if (dstInfo.totalLength < data.length) {
    preservedData = data.slice(dstInfo.totalLength);
  }

  const clientToDst = connect(clientOptions, onConnect);

  clientToDst.on('data', (clientData) => {
    if (!cipher) {
      tmp = createCipher(password, method, clientData);
      cipher = tmp.cipher;
      cipheredData = tmp.data;
    } else {
      cipheredData = cipher.update(clientData);
    }

    if (isLocalConnected()) {
      writeOrPause(clientToDst, connection, cipheredData);
    } else {
      clientToDst.destroy();
    }
  });

  clientToDst.on('drain', () => {
    connection.resume();
  });

  clientToDst.on('end', () => {
    if (isLocalConnected()) {
      connection.end();
    }
  });

  clientToDst.on('error', (e) => {
    logger.warn(`ssServer error happened when write to DST: ${e.message}`);
    onDestroy();
  });

  clientToDst.on('close', (e) => {
    if (isLocalConnected()) {
      if (e) {
        connection.destroy();
      } else {
        connection.end();
      }
    }
  });

  return {
    clientToDst, preservedData,
  };
}

function handleConnection(config, connection) {
  let stage = 0;
  let clientToDst = null;
  let decipher = null;
  let tmp;
  let data;
  let localConnected = true;
  let dstConnected = false;
  let timer = null;

  connection.on('data', (chunck) => {
    try {
      if (!decipher) {
        tmp = createDecipher(config.password, config.method, chunck);
        decipher = tmp.decipher;
        data = tmp.data;
      } else {
        data = decipher.update(chunck);
      }
    } catch (e) {
      logger.warn(`${NAME} receive invalid data`);
      return;
    }

    switch (stage) {
      case 0:
        // TODO: should pause? or preserve data?
        connection.pause();

        tmp = createClientToDst(
          connection, data,
          config.password, config.method,
          () => {
            dstConnected = true;
            connection.resume();
          },
          () => {
            if (dstConnected) {
              dstConnected = false;
              clientToDst.destroy();
            }

            if (localConnected) {
              localConnected = false;
              connection.destroy();
            }
          },
          () => localConnected
        );

        if (!tmp) {
          connection.destroy();
          return;
        }

        clientToDst = tmp.clientToDst;

        if (tmp.preservedData) {
          writeOrPause(connection, clientToDst, tmp.preservedData);
        }

        stage = 1;
        break;
      case 1:
        writeOrPause(connection, clientToDst, data);
        break;
      default:
    }
  });

  connection.on('drain', () => {
    clientToDst.resume();
  });

  connection.on('end', () => {
    localConnected = false;

    if (dstConnected) {
      clientToDst.end();
    }
  });

  connection.on('error', (e) => {
    logger.warn(`ssServer error happened in the connection with ssLocal : ${e.message}`);
  });

  connection.on('close', (e) => {
    if (timer) {
      clearTimeout(timer);
    }

    localConnected = false;

    if (dstConnected) {
      if (e) {
        clientToDst.destroy();
      } else {
        clientToDst.end();
      }
    }
  });

  timer = setTimeout(() => {
    if (localConnected) {
      connection.destroy();
    }

    if (dstConnected) {
      clientToDst.destroy();
    }
  }, config.timeout * 1000);
}

function createServer(config) {
  const { serverAddr, udpActive = true } = config;
  const server = _createServer(handleConnection.bind(null, config))
    .listen(config.serverPort, serverAddr);

  let udpRelay = null;

  if (udpActive) {
    udpRelay = createUDPRelay(config, true, logger);
  }

  server.on('close', () => {
    logger.warn(`${NAME} server closed`);
  });

  server.on('error', (e) => {
    logger.error(`${NAME} server error: ${e.message}`);
  });

  logger.verbose(`${NAME} is listening on ${config.serverAddr}:${config.serverPort}`);

  return {
    server, udpRelay,
  };
}

// eslint-disable-next-line
export function startServer(config, willLogToConsole = false, injectedLogger) {
  logger = logger || injectedLogger
    || createLogger(config, LOG_NAMES.SERVER, willLogToConsole);

  return createServer(config);
}

if (module === require.main) {
  getConfig(process.argv.slice(2), (err, config) => {
    if (err) {
      throw err;
    }

    const { proxyOptions } = config;

    logger = createLogger(
      proxyOptions,
      LOG_NAMES.SERVER,
      true,
      true,
    );
    startServer(proxyOptions, false);

    // TODO:
    // NOTE: DEV only
    // eslint-disable-next-line
    // if (config._recordMemoryUsage) {
    //   setInterval(() => {
    //     process.send(process.memoryUsage());
    //   }, INTERVAL_TIME);
    // }
  });

  process.on('uncaughtException', (err) => {
    logger.error(`${NAME} uncaughtException: ${err.stack}`, createSafeAfterHandler(logger, () => {
      process.exit(1);
    }));
  });
}
