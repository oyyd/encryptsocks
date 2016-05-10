import { createServer as _createServer, connect } from 'net';
import { getDstInfo, writeOrPause, getDstStr } from './utils';
import logger, { changeLevel } from './logger';
import { createCipher, createDecipher } from './encryptor';
import createUDPRelay from './createUDPRelay';
import ip from 'ip';
// import { filter } from './filter';

const NAME = 'ssLocal';

function handleMethod(connection, data) {
  // +----+----------+----------+
  // |VER | NMETHODS | METHODS  |
  // +----+----------+----------+
  // | 1  |    1     | 1 to 255 |
  // +----+----------+----------+
  const buf = new Buffer(2);

  // allow `no authetication` or any usename/password
  if (!~data.indexOf(0x00, 2) && !~data.indexOf(0x02, 2)) {
    logger.warn(`unsupported method: ${data.toString('hex')}`);
    buf.writeUInt16BE(0x05FF);
    connection.write(buf);
    connection.end();
    return -1;
  }

  buf.writeUInt16BE(0x0500);
  logger.debug(`1. TRY TO WRITE: ${buf}`);
  connection.write(buf);

  return 1;
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

    logger.debug(`Response to udp association: ${repBuf.toString('hex')}`);
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

  clientToRemote.on('data', remoteData => {
    if (!decipher) {
      tmp = createDecipher(password, method, remoteData);
      if (!tmp) {
        logger.warn(`${NAME} ssLocal get invalid msg`);
        onDestroy();
        return;
      }
      decipher = tmp.decipher;
      decipheredData = tmp.data;
    } else {
      decipheredData = decipher.update(remoteData);
    }

    logger.debug(`${NAME} received data from remote: ${decipheredData.toString('hex')}`);

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

  clientToRemote.on('error', e => {
    logger.warn('ssLocal error happened in clientToRemote when'
      + ` connecting to ${getDstStr(dstInfo)}: ${e.message}`);

    onDestroy();
  });

  clientToRemote.on('close', e => {
    if (e) {
      connection.destroy();
    } else {
      connection.end();
    }
  });

  // write
  logger.debug(`2. TRY TO WRITE: ${repBuf.toString('hex')}`);
  connection.write(repBuf);

  writeOrPause(connection, clientToRemote, cipheredData);

  return {
    stage: 2,
    cipher,
    clientToRemote,
  };
}

function handleConnection(config, connection) {
  let stage = 0;
  let clientToRemote;
  let tmp;
  let cipher;
  let dstInfo;
  let remoteConnected = false;
  let clientConnected = true;
  let timer = null;

  connection.on('data', data => {
    switch (stage) {
      case 0:
        logger.debug(`ssLocal at stage ${stage} received `
          + `data from client: ${data.toString('hex')}`);

        stage = handleMethod(connection, data);

        break;
      case 1:
        dstInfo = getDstInfo(data);

        if (!dstInfo) {
          logger.warn(`Failed to get 'dstInfo' from parsing data: ${data}`);
          connection.destroy();
          return;
        }

        // if (!filter(dstInfo)) {
        //   // TODO: clean everything
        //   connection.end();
        //   connection.destroy();
        //   stage = -1;
        //   return;
        // }

        logger.debug(`ssLocal at stage ${stage} received data `
          + `from client: ${data.toString('hex')}`);

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
        logger.debug(`ssLocal at stage ${stage} received data `
          + `from client and write to remote: ${tmp.toString('hex')}`);

        writeOrPause(connection, clientToRemote, tmp);

        break;
      default:
        return;
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

  connection.on('close', e => {
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

  connection.on('error', e => {
    logger.warn(`${NAME} error happened in client connection: ${e.message}`);
  });

  timer = setTimeout(() => {
    logger.warn(`${NAME} connection timeout.`);
    if (clientConnected) {
      connection.destroy();
    }

    if (remoteConnected) {
      clientToRemote.destroy();
    }
  }, config.timeout * 1000);
}

function createServer(config) {
  const server = _createServer(handleConnection.bind(null, config));
  const udpRelay = createUDPRelay(config, false);

  server.on('close', () => {
    logger.warn(`${NAME} server closed`);
  });

  server.on('error', e => {
    logger.error(`${NAME} server error: ${e.message}`);
  });

  server.listen(config.localPort);
  logger.verbose(`${NAME} is listening on ${config.localAddr}:${config.localPort}`);

  return {
    server, udpRelay,
  };
}

export function startServer(config) {
  const server = createServer(config);
  const level = config.level;

  if (level) {
    changeLevel(logger, level);
  }

  return server;
}

if (module === require.main) {
  process.on('message', config => {
    startServer(config);
  });
}
