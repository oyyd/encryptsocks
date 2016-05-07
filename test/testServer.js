'use strict';

const http = require('http');
const https = require('https');
const dgram = require('dgram');
const Socks = require('socks');
const config = require('../config.json');

const DST_RES_TEXT = 'hello world!';
const DST_ADDR = '127.0.0.1';
const DST_PORT = 42134;
const SOCKS_PORT = config.localPort;

const UDP_RES_TYPE = {
  CONTINUOUS: 'CONTINUOUS',
  REPEAT_ONCE: 'REPEAT_ONCE',
};
const UDP_RES_MSG = 'Hello there';

const UDP_ASSOCIATE_OPTIONS = {
  proxy: {
    ipaddress: DST_ADDR,
    port: SOCKS_PORT,
    type: 5,
    command: 'associate',
  },
  target: {
    host: DST_ADDR,
    port: DST_PORT,
  },
};

function createHTTPServer(cb) {
  return http.createServer((req, res) => {
    res.end(DST_RES_TEXT);
  }).listen(DST_PORT, cb);
}

function createHTTPSServer() {
  //TODO:
}

function createUDPServer() {
  const server = dgram.createSocket('udp4');

  let msgTimer;

  server.bind(DST_PORT, DST_ADDR);

  server.on('message', (msg, info) => {
    switch (msg.toString('utf8')) {
      case UDP_RES_TYPE.CONTINUOUS:
        for(let i = 0; i < 3; i++) {
          server.send(UDP_RES_MSG, 0, UDP_RES_MSG.length, info.port, info.address);
        }
        return;
      case UDP_RES_TYPE.REPEAT_ONCE:
        server.send(msg, 0, msg.length, info.port, info.address);
        return;
      default:
        console.log('unknown msg');
    }
  });

  return server;
}

function sendUDPFrame(client, port, host, data) {

  const frame = Socks.createUDPFrame({
    host: DST_ADDR,
    port: DST_PORT,
  }, new Buffer(data));

  client.send(frame, 0, frame.length, port, host);
}

function createUDPAssociate(onReady, onMessage) {
  const options = Object.assign({}, {
    proxy: Object.assign({}, UDP_ASSOCIATE_OPTIONS.proxy),
    target: Object.assign({}, UDP_ASSOCIATE_OPTIONS.target),
  });

  Socks.createConnection(options, (err, socket, info) => {
    if (err) {
      console.log('ERR: ', err.stack);
      return;
    }

    const client = new dgram.Socket('udp4');

    client.on('message', (msg, info) => {
      onMessage(msg, info, client);
    });

    onReady(sendUDPFrame.bind(null, client, info.port, info.host), client);
  });
}

function createUDPClient() {
  const server = dgram.createSocket('udp4');
  const MSG = 'Hello';

  let msgTimer;

  server.on('message', (msg, info) => {
    console.log(`RECEIVE msg: ${msg}`);
  });

  msgTimer = setInterval(() => {
    server.send(MSG, 0, MSG.length, DST_PORT, DST_ADDR);
  }, 1000);

  return server;
}


module.exports = {
  DST_PORT, DST_ADDR, DST_RES_TEXT,
  UDP_RES_MSG, UDP_RES_TYPE,
  createHTTPServer,
  createUDPServer,
  createUDPClient,
  createUDPAssociate,
};

if (module === require.main) {
  // createHTTPServer(() => {
  //   console.log(`test server is running on ${DST_ADDR}:${DST_PORT}`);
  // });
  createUDPServer();
  createUDPClient();
}
