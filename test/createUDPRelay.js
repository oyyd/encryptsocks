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

describe('UDP Relay', () => {
  let dstServer;
  let ssLocalServer;
  let ssServerServer;

  before(() => {
    ssLocalServer = ssLocal.startServer();
    ssServerServer = ssServer.startServer();
    dstServer = createUDPServer();
  });

  it.only('should work in for UDP association', cb => {
    createUDPAssociate((msg, info) => {
      assert(msg, 'Hello there');
      cb();
    });
  });

  after(() => {
    dstServer.close();
    ssLocalServer.server.close();
    ssLocalServer.udpRelay.close();
    ssServerServer.server.close();
    ssServerServer.udpRelay.close();
  });
});
