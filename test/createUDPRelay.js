'use strict';

const assert = require('assert');

const utils = require('../lib/utils');
const testServer = require('./testServer');
const ssLocal = require('../lib/ssLocal');
const ssServer = require('../lib/ssServer');
const _config = require('../lib/defaultConfig.js').default;
const LOCAL_ONLY = require('./utils').LOCAL_ONLY;

const config = Object.assign({}, _config, {
  'level': 'error',
});

const strictEqual = assert.strictEqual;
const DST_RES_TEXT = testServer.DST_RES_TEXT;
const DST_ADDR = testServer.DST_ADDR;
const DST_PORT = testServer.DST_PORT;

const createUDPAssociate = testServer.createUDPAssociate;
const createUDPServer = testServer.createUDPServer;

const TIMEOUT = 5000;
const UDP_RES_TYPE = testServer.UDP_RES_TYPE;
const UDP_RES_MSG = testServer.UDP_RES_MSG;

describe('UDP Relay', () => {
  let dstServer;
  let ssLocalServer;
  let ssServerServer;

  before(() => {
    ssLocalServer = ssLocal.startServer(config);
    ssServerServer = ssServer.startServer(config);
    dstServer = createUDPServer();
  });

  it('should work for UDP association and receive message repeately', function(cb) {
    this.timeout(5000);

    let EXPECTED_TIME = 3;
    let count = 0;

    createUDPAssociate((sendUDPFrame) => {
      sendUDPFrame(UDP_RES_TYPE.CONTINUOUS);
    }, (msg, info, client) => {
      assert(msg, UDP_RES_MSG);

      count ++;

      if (count === EXPECTED_TIME){
        client.close();
        cb();
      }
    });
  });

  it('should work for UDP association', function(cb) {
    this.timeout(5000);

    let EXPECTED_TIME = 3;
    let count = 0;

    createUDPAssociate((sendToDST) => {
      let i;

      for (i = 0; i <= EXPECTED_TIME; i++) {
        sendToDST(UDP_RES_TYPE.REPEAT_ONCE);
      }
    }, (msg, info, client) => {
      assert(msg.toString(), UDP_RES_TYPE.REPEAT_ONCE);

      count ++;

      if (count === EXPECTED_TIME){
        client.close();
        cb();
      }
    });
  });

  after(() => {
    dstServer.close();
    ssLocalServer.closeAll();
    ssServerServer.server.close();
    ssServerServer.udpRelay.close();
  });
});

describe(LOCAL_ONLY + ' UDP6 Relay', () => {
  let ssLocalServer;
  let ssServerServer;
  let dstServerUDP6;

  before(() => {
    ssLocalServer = ssLocal.startServer(config);
    ssServerServer = ssServer.startServer(config);
    dstServerUDP6 = createUDPServer('udp6');
  });

  it('should work for UDP association for UDP6', function(cb) {
    this.timeout(5000);

    let EXPECTED_TIME = 3;
    let count = 0;

    createUDPAssociate((sendToDST) => {
      let i;

      for (i = 0; i <= EXPECTED_TIME; i++) {
        sendToDST(UDP_RES_TYPE.REPEAT_ONCE);
      }
    }, (msg, info, client) => {
      assert(msg.toString(), UDP_RES_TYPE.REPEAT_ONCE);

      count ++;

      if (count === EXPECTED_TIME){
        client.close();
        cb();
      }
    }, true);
  });

  after(() => {
    dstServerUDP6.close();
    ssLocalServer.closeAll();
    ssServerServer.server.close();
    ssServerServer.udpRelay.close();
  });
});
