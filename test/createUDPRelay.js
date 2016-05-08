'use strict';

const assert = require('assert');

const utils = require('../lib/utils');
const testServer = require('./testServer');
const ssLocal = require('../lib/ssLocal');
const ssServer = require('../lib/ssServer');

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
  let dstServerUDP6;

  before(() => {
    ssLocalServer = ssLocal.startServer();
    ssServerServer = ssServer.startServer();
    dstServer = createUDPServer();
    dstServerUDP6 = createUDPServer('udp6');
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
    dstServer.close();
    dstServerUDP6.close();
    ssLocalServer.server.close();
    ssLocalServer.udpRelay.close();
    ssServerServer.server.close();
    ssServerServer.udpRelay.close();
  });
});
