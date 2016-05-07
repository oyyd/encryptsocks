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
  const MSG = 'Hello there';

  let msgTimer;

  server.bind(DST_PORT, DST_ADDR);

  server.on('message', (msg, info) => {
    server.send(MSG, 0, MSG.length, info.port, info.address);
  });

  return server;
}

function createUDPAssociate(onMessage) {
  Socks.createConnection(UDP_ASSOCIATE_OPTIONS, (err, socket, info) => {
    if (err) {
      console.log('ERR: ', err.stack);
      return;
    }

    const client = new dgram.Socket('udp4');
    const frame = Socks.createUDPFrame({
      host: DST_ADDR,
      port: DST_PORT,
    }, new Buffer('`Hello` from client'));

    client.on('message', onMessage);

    console.log("TRY TO SEND", frame);
    client.send(frame, 0, frame.length, info.port, info.host);
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
