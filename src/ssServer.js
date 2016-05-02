import { createServer as _createServer, connect } from 'net';
import {
  getConfig, getDstInfo, inetNtoa, writeOrPause, getArgv,
} from './utils';
import logger, { changeLevel } from './logger';
import { createCipher, createDecipher } from './encryptor';
import createUDPRelay from './createUDPRelay';

const NAME = 'ssServer';

function flushPreservedData(connection, clientToDst, dataArr) {
  let i = dataArr.length;

  while (i > 0) {
    i--;
    writeOrPause(connection, clientToDst, dataArr[i]);
  }

  dataArr.length = 0;
}

function createClientToDst(connection, data, preservedData, password, method, cb) {
  const dstInfo = getDstInfo(data, true);

  let clientToDst;
  let clientOptions;
  let cipher = null;
  let tmp;

  if (!dstInfo) {
    return null;
  }

  if (dstInfo.totalLength < data.length) {
    preservedData.push(data.slice(dstInfo.totalLength));
  }

  clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: (dstInfo.atyp === 3
      ? dstInfo.dstAddr.toString('ascii') : inetNtoa(dstInfo.dstAddr)),
  };

  clientToDst = connect(clientOptions, cb);

  clientToDst.on('data', clientData => {
    logger.debug(`server received data from DST:${clientData.toString('ascii')}`);
    if (!cipher) {
      tmp = createCipher(password, method, clientData);
      cipher = tmp.cipher;
      writeOrPause(clientToDst, connection, tmp.data);
    } else {
      writeOrPause(clientToDst, connection, cipher.update(clientData));
    }
  });

  clientToDst.on('drain', () => {
    connection.resumse();
  });

  clientToDst.on('end', () => {
    if (connection) {
      connection.end();
    }
  });

  clientToDst.on('error', e => {
    logger.warn(`ssServer error happened when write to DST: ${e.message}`);
  });

  clientToDst.on('close', e => {
    if (connection) {
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

  connection.on('data', chunck => {
    if (!decipher) {
      tmp = createDecipher(config.password, config.method, chunck);
      decipher = tmp.decipher;
      data = tmp.data;
    } else {
      data = decipher.update(chunck);
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
            connection.resume();
          }
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

  connection.on('drain', () => {
    clientToDst.resume();
  });

  connection.on('end', () => {
    if (clientToDst) {
      clientToDst.end();
    }
  });

  connection.on('error', e => {
    logger.warn(`ssServer error happened in the connection with ssLocal : ${e.message}`);
  });

  connection.on('close', e => {
    if (clientToDst) {
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
