import { createServer as _createServer, connect } from 'net';
import { getConfig, getDstInfo, inetNtoa } from './utils';
import logger from './logger';
import { createCipher, createDecipher } from './encryptor';

function flushPreservedData(connection, dataArr) {
  let i = dataArr.length;

  while (i > 0) {
    i--;
    connection.write(dataArr[i]);
    logger.debug(dataArr[i].toString('ascii'));
  }

  dataArr.length = 0;
}

function createClientToDst(connection, data, preservedData, password, method) {
  const dstInfo = getDstInfo(data);
  let client;
  let clientOptions;
  let cipher = null;
  let tmp;

  if (!dstInfo) {
    return null;
  }

  // console.log(dstInfo);
  // console.log(data.slice(dstInfo.totalLength).toString('ascii'));
  preservedData.push(data.slice(dstInfo.totalLength));

  clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: (dstInfo.atyp === 3
      ? dstInfo.dstAddr.toString('ascii') : inetNtoa(dstInfo.dstAddr)),
  };

  client = connect(clientOptions);

  client.on('data', clientData => {
    logger.debug(`server received data from DST:${clientData.toString('ascii')}`);
    if (!cipher) {
      tmp = createCipher(password, method, clientData);
      cipher = tmp.cipher;
      connection.write(tmp.data);
    } else {
      connection.write(cipher.update(clientData));
    }
  });

  client.on('close', () => {
    connection.destroy();
  });

  client.on('error', e => {
    logger.warn(`ssServer error happened: ${e.message}`);
    connection.destroy();
  });

  return client;
}

function handleConnection(config, connection) {
  const preservedData = [];

  let stage = 0;
  let clientToDst = null;
  let decipher = null;
  let tmp;

  connection.on('data', data => {
    if (!decipher) {
      tmp = createDecipher(config.password, config.method, data);
      decipher = tmp.decipher;
      data = tmp.data;
    } else {
      data = decipher.update(data);
    }

    switch (stage) {

      case 0:
        logger.debug(`server at stage ${stage} received data: ${data.toString('hex')}`);

        clientToDst = createClientToDst(
          connection, data, preservedData,
          config.password, config.method
        );

        if (!clientToDst) {
          // TODO: throw
          connection.destroy();
          return;
        }

        flushPreservedData(clientToDst, preservedData);

        stage = 1;
        break;
      case 1:
        logger.debug(`server at stage ${stage} received data: ${data.toString('ascii')}`);

        clientToDst.write(data);
        break;
      default:
        return;
    }
  });

  connection.on('error', e => {
    logger.warn(`ssServer error happened: ${e.message}`);

    if (clientToDst) {
      clientToDst.destroy();
    }
  });
}

function createServer(config) {
  const server = _createServer(handleConnection.bind(null, config));

  return server;
}

export function startServer() {
  const config = getConfig();

  // TODO: port occupied
  const server = createServer(config).listen(config.server_port);

  return server;
}
