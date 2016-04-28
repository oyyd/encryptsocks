import { createServer as _createServer, connect } from 'net';
import { getConfig, getDstInfo, writeOrPause, getArgv, getDstStr } from './utils';
import logger, { changeLevel } from './logger';
import { createCipher, createDecipher } from './encryptor';
import { filter } from './filter';

// TODO: remove or handle
let _id = 0;

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
  logger.debug(`1. TRY TO WRITE: ${buf}`);
  connection.write(buf);

  return 1;
}

function handleRequest(
  connection, data, remoteAddr, remotePort, password, method,
  dstInfo
) {
  const cmd = data[1];
  // TODO: most dst infos are not used
  const repBuf = new Buffer(10);
  // TODO: support domain and ipv6
  const clientOptions = {
    port: remotePort,
    host: remoteAddr,
  };

  let clientToRemote;
  let tmp = null;
  let decipher = null;
  let decipheredData = null;
  let cipher = null;
  let cipheredData = null;

  logger.verbose(`connecting: ${dstInfo.dstAddr.toString('utf8')}:${dstInfo.dstPort.readUInt16BE()}`);

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

  // prepare data

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

  tmp = createCipher(password, method,
    data.slice(3)); // skip VER, CMD, RSV
  logger.warn(data.slice(3).toString('hex'));
  cipher = tmp.cipher;
  cipheredData = tmp.data;

  // connect

  clientToRemote = connect(clientOptions);

  // TODO: should pause until the replay finished
  clientToRemote.on('data', remoteData => {
    // TODO:
    if (!decipher) {
      tmp = createDecipher(password, method, remoteData);
      decipher = tmp.decipher;
      decipheredData = tmp.data;
    } else {
      decipheredData = decipher.update(remoteData);
    }

    logger.debug(`ssLocal received data from remote: ${decipheredData.toString('hex')}`);
    writeOrPause(clientToRemote, connection, decipheredData);
  });

  clientToRemote.on('drain', () => {
    connection.resume();
  });

  clientToRemote.on('end', () => {
    connection.end();
  });

  clientToRemote.on('error', e => {
    logger.warn(`ssLocal error happened in clientToRemote when connecting to ${getDstStr(dstInfo)}: ${e.message}`);
  });

  clientToRemote.on('close', e => {
    if (e) {
      connection.destroy();
    } else {
      connection.end();
    }
  })

  // write

  logger.debug(`2. TRY TO WRITE: ${repBuf.toString('hex')}`);
  connection.write(repBuf);

  // TODO: write before connected
  writeOrPause(connection, clientToRemote, cipheredData);

  return {
    stage: 2,
    cipher: cipher,
    clientToRemote,
  };
}

function handleConnection(config, connection) {
  const id = _id++;
  const preservedData = [];

  let stage = 0;
  let clientToRemote;
  let tmp;
  let cipher;
  let dstInfo;

  connection.on('data', data => {
    switch (stage) {
      case 0:
        logger.debug(`ssLocal(${id}) at stage ${stage} received data from client: ${data.toString('hex')}`);

        stage = handleMethod(connection, data);

        break;
      case 1:
        dstInfo = getDstInfo(data);

        // TODO:
        if (!filter(dstInfo)) {
          // TODO: clean everything
          connection.end();
          connection.destroy();
          stage = -1;
          return;
        }

        logger.debug(`ssLocal(${id}) at stage ${stage} received data from client: ${data.toString('hex')}`);

        tmp = handleRequest(
          connection, data, config.server, config.server_port,
          config.password, config.method, dstInfo
        );
        clientToRemote = tmp.clientToRemote;
        stage = tmp.stage;
        cipher = tmp.cipher;


        break;
      case 2:
        tmp = cipher.update(data);
        logger.debug(`ssLocal(${id}) at stage ${stage} received data from client and write to remote: ${tmp.toString('hex')}`);

        writeOrPause(connection, clientToRemote, tmp);

        break;
      default:
        return;
    }
  });

  connection.on('drain', () => {
    console.log('DRAIN');
    clientToRemote.resume();
  });

  connection.on('end', () => {
    // TODO: test existence
    if (clientToRemote) {
      clientToRemote.end();
    }
  });

  connection.on('close', e => {
    if (clientToRemote) {
      if (e) {
        clientToRemote.destroy();
      } else {
        clientToRemote.end();
      }
    }
  });

  connection.on('error', e => {
    logger.warn(`ssLocal error happened in client connection: ${e.message}`);
  });

  if (stage === -1) {
    connection.destroy();
  }
}

function createServer(config) {
  const server = _createServer(handleConnection.bind(null, config));

  server.on('close', () => {
    // TODO:
  });

  server.on('error', e => {
    // TODO:
    logger.warn(`ssLocal server error: ${e.message}`);
  });

  return server;
}

export function startServer() {
  const argv = getArgv();

  const config = getConfig();

  if (argv.level) {
    changeLevel(logger, argv.level);
  }

  // TODO: throw when the port is occupied
  const server = createServer(config).listen(config.local_port);

  return server;
}
