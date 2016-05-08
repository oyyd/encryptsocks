import { createServer as _createServer, connect } from 'net';
import {
  getConfig, getDstInfo, writeOrPause, getArgv,
} from './utils';
import logger, { changeLevel } from './logger';
import { createCipher, createDecipher } from './encryptor';
import createUDPRelay from './createUDPRelay';
import ip from 'ip';

const NAME = 'ssServer';

function createClientToDst(
  connection, data,
  password, method, onConnect, isLocalConnected
) {
  const dstInfo = getDstInfo(data, true);

  let cipher = null;
  let tmp;
  let cipheredData;
  let preservedData = null;

  if (!dstInfo) {
    logger.warn(`${NAME} receive invalid msg.`);
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

  clientToDst.on('data', clientData => {
    logger.debug(`server received data from DST:${clientData.toString('ascii')}`);

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
    connection.resumse();
  });

  clientToDst.on('end', () => {
    if (isLocalConnected()) {
      connection.end();
    }
  });

  clientToDst.on('error', e => {
    logger.warn(`ssServer error happened when write to DST: ${e.stack}`);
  });

  clientToDst.on('close', e => {
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

  connection.on('data', chunck => {
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
        logger.debug(`server at stage ${stage} received data: ${data.toString('hex')}`);

        // TODO: should pause? or preserve data?
        connection.pause();

        tmp = createClientToDst(
          connection, data,
          config.password, config.method,
          () => {
            dstConnected = true;
            connection.resume();
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
        logger.debug(`server at stage ${stage} received data: ${data.toString('ascii')}`);

        writeOrPause(connection, clientToDst, data);

        break;
      default:
        return;
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

  connection.on('error', e => {
    logger.error(`ssServer error happened in the connection with ssLocal : ${e.message}`);
  });

  connection.on('close', e => {
    localConnected = false;

    if (dstConnected) {
      if (e) {
        clientToDst.destroy();
      } else {
        clientToDst.end();
      }
    }
  });

  setTimeout(() => {
    logger.warn(`${NAME} connection timeout.`);

    if (localConnected) {
      connection.destroy();
    }

    if (dstConnected) {
      clientToDst.destroy();
    }
  }, config.timeout * 1000);
}

function createServer(config) {
  const server = _createServer(handleConnection.bind(null, config)).listen(config.serverPort);
  const udpRelay = createUDPRelay(config, true);

  server.on('close', () => {
    logger.warn(`${NAME} server closed`);
  });

  server.on('error', e => {
    logger.error(`${NAME} server error: ${e.message}`);
  });

  logger.verbose(`${NAME} is listening on ${config.serverAddr}:${config.serverPort}`);

  return {
    server, udpRelay,
  };
}

export function startServer(_config) {
  const argv = getArgv();
  const config = _config || getConfig();
  const level = argv.level || config.level;

  if (level) {
    changeLevel(logger, level);
  }

  const server = createServer(config);

  return server;
}
