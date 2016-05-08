import { createServer as _createServer, connect } from 'net';
import {
  getConfig, getDstInfo, writeOrPause, getArgv,
} from './utils';
import logger, { changeLevel } from './logger';
import { createCipher, createDecipher } from './encryptor';
import createUDPRelay from './createUDPRelay';
import ip from 'ip';

const NAME = 'ssServer';

function flushPreservedData(connection, clientToDst, dataArr) {
  let i = dataArr.length;

  while (i > 0) {
    i--;
    writeOrPause(connection, clientToDst, dataArr[i]);
  }

  dataArr.length = 0;
}

function createClientToDst(
  connection, data, preservedData,
  password, method, onConnect, isLocalConnected
) {
  const dstInfo = getDstInfo(data, true);

  let clientToDst;
  let clientOptions;
  let cipher = null;
  let tmp;
  let cipheredData;

  if (!dstInfo) {
    return null;
  }

  if (dstInfo.totalLength < data.length) {
    preservedData.push(data.slice(dstInfo.totalLength));
  }

  clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: (dstInfo.atyp === 3
      ? dstInfo.dstAddr.toString('ascii') : ip.toString(dstInfo.dstAddr)),
  };

  clientToDst = connect(clientOptions, onConnect);

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

  return clientToDst;
}

function handleConnection(config, connection) {
  // TODO: is this necessary?
  const preservedData = [];

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

        clientToDst = createClientToDst(
          connection, data, preservedData,
          config.password, config.method,
          () => {
            dstConnected = true;
            connection.resume();
          },
          () => localConnected
        );

        if (!clientToDst) {
          // TODO: throw
          connection.destroy();
          return;
        }

        flushPreservedData(connection, clientToDst, preservedData);

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

  // TODO: setTimeout to close sockets

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
    logger.warn(`ssServer error happened in the connection with ssLocal : ${e.message}`);
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
}

function createServer(config) {
  const server = _createServer(handleConnection.bind(null, config)).listen(config.serverPort);
  const udpRelay = createUDPRelay(config, true);

  logger.verbose(`${NAME} is listening on ${config.serverAddr}:${config.serverPort}`);

  return {
    server, udpRelay,
  };
}

export function startServer() {
  const argv = getArgv();
  const config = getConfig();
  const level = argv.level || config.level;

  if (level) {
    changeLevel(logger, level);
  }

  // TODO: port occupied
  const server = createServer(config);

  return server;
}
