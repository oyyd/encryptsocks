import { createServer as _createServer, connect } from 'net';
import { getConfig, getDstInfo } from './utils';
import logger from './logger';
import { createCipher, createDecipher } from './encryptor';

function handleMethod(connection, data) {
  // +----+----------+----------+
  // |VER | NMETHODS | METHODS  |
  // +----+----------+----------+
  // | 1  |    1     | 1 to 255 |
  // +----+----------+----------+
  const buf = new Buffer(2);

  // TODO:
  // if (data[0] !== 0x05) {
  //   console.log('unsupported socks version');
  //   return -1;
  // }

  if (!~data.indexOf(0x00, 2)) {
    logger.warn('unsupported method');
    buf.writeUInt16BE(0x05FF);
    connection.write(buf);
    return -1;
  }

  buf.writeUInt16BE(0x0500);
  connection.write(buf);

  return 1;
}

function handleRequest(
  connection, data, remoteAddr, remotePort, password, method
) {
  const cmd = data[1];
  // TODO: most dst infos are not used
  const dstInfo = getDstInfo(data);
  const repBuf = new Buffer(10);
  // TODO: support domain and ipv6
  const clientOptions = {
    port: remotePort,
    host: remoteAddr,
  };

  let clientToRemote;
  let tmp = null;
  let decipher = null;

  if (cmd !== 0x01) {
    logger.warn('unsupported cmd');
    return {
      stage: -1,
    };
  }

  if (!dstInfo) {
    return {
      stage: -1,
    };
  }

  clientToRemote = connect(clientOptions);

  // TODO: should pause until the replay finished
  clientToRemote.on('data', remoteData => {
    // TODO:
    if (!decipher) {
      tmp = createDecipher(password, method, remoteData);
      decipher = tmp.decipher;
      connection.write(tmp.data);
    } else {
      connection.write(decipher.update(remoteData));
    }
  });

  clientToRemote.on('close', () => {
    connection.destroy();
  });

  connection.on('error', e => {
    logger.warn(`ssLocal error happened: ${e.message}`);
    connection.destroy();
  });

  tmp = createCipher(password, method, data);

  clientToRemote.write(tmp.data);

  // +----+-----+-------+------+----------+----------+
  // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+

  // TODO: should fill BND fields with 0?
  repBuf.writeUInt16BE(0x0500);
  repBuf.writeUInt16BE(dstInfo.atyp, 2);
  // TODO: why?
  repBuf.writeUInt32BE(0x00000000, 4, 4);
  repBuf.writeUInt32BE(2222, 8, 2);

  connection.write(repBuf);

  return {
    stage: 2,
    cipher: tmp.cipher,
    clientToRemote,
  };
}

function handleConnection(config, connection) {
  let stage = 0;
  let clientToRemote;
  let tmp;
  let cipher;

  connection.on('data', data => {
    switch (stage) {
      case 0:
        logger.debug(`ssLocal at stage ${stage} received data: ${data.toString('hex')}`);

        stage = handleMethod(connection, data);
        break;
      case 1:
        logger.debug(`ssLocal at stage ${stage} received data: ${data.toString('hex')}`);

        tmp = handleRequest(
          connection, data, config.server, config.server_port,
          config.password, config.method
        );
        clientToRemote = tmp.clientToRemote;
        stage = tmp.stage;
        cipher = tmp.cipher;

        break;
      case 2:
        logger.debug(`ssLocal at stage ${stage} received data: ${data.toString('hex')}`);
        clientToRemote.write(cipher.update(data));
        break;
      default:
        return;
    }

    connection.on('error', e => {
      logger.warn(`ssLocal error happened: ${e.message}`);

      if (clientToRemote) {
        clientToRemote.destroy();
      }
    });

    if (stage === -1) {
      connection.destroy();
    }
  });
}

function createServer(config) {
  const server = _createServer(handleConnection.bind(null, config));

  server.on('close', () => {
    // TODO:
  });

  server.on('error', () => {
    // TODO:
  });

  return server;
}

export function startServer() {
  const config = getConfig();

  // TODO: throw when the port is occupied
  const server = createServer(config).listen(config.local_port);

  return server;
}
