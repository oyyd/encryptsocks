'use strict';

const shttp = require('socks5-http-client');
const shttps = require('socks5-https-client');
const http = require('http');
const assert = require('assert');
const ip = require('ip');

const testServer = require('./testServer');
const ssLocal = require('../lib/ssLocal');
const ssServer = require('../lib/ssServer');
const utils = require('../lib/utils');
const config = require('../config.json');

const strictEqual = assert.strictEqual;
const getDstInfo = utils.getDstInfo;
const DST_RES_TEXT = testServer.DST_RES_TEXT;
const DST_ADDR = testServer.DST_ADDR;
const DST_PORT = testServer.DST_PORT;
const createHTTPServer = testServer.createHTTPServer;

const TIMEOUT = 5000;

describe('getDstInfo', () => {

  it('should return `null` when the `atyp` type is not supported ', () => {
    const buffer = new Buffer(10);
    buffer.write('050100027f000001a496', 'hex');

    const dstInfo = getDstInfo(buffer);

    strictEqual(dstInfo, null);
  });

  it('should return correct DST info when parsing ipv4', () => {
    const buffer = new Buffer(10);
    buffer.write('050100017f000001a496', 'hex');

    const dstInfo = getDstInfo(buffer);

    strictEqual(dstInfo.atyp, 0x01);
    strictEqual(dstInfo.dstAddrLength, 4);
    strictEqual(ip.toString(dstInfo.dstAddr), '127.0.0.1');
    strictEqual(dstInfo.dstPort.readUInt16BE(), 42134);
  });

  it('should return correct DST info when parsing ipv6', () => {
    const buffer = new Buffer(22);
    buffer.write('0501000400000000000000000000000000000001a496', 'hex');

    const dstInfo = getDstInfo(buffer);

    strictEqual(dstInfo.atyp, 0x04);
    strictEqual(dstInfo.dstAddrLength, 16);
    strictEqual(ip.toString(dstInfo.dstAddr), '::1');
    strictEqual(dstInfo.dstPort.readUInt16BE(), 42134);
  });

  it('should return correct DST info when parsing domain', () => {
    const buffer = new Buffer(18);
    buffer.write('050100030b', 0, 'hex');
    buffer.write('example.com', 5, 'ascii');
    buffer.writeUInt16BE(80, 16);

    const dstInfo = getDstInfo(buffer);

    strictEqual(dstInfo.atyp, 0x03);
    strictEqual(dstInfo.dstAddrLength, 11);
    strictEqual(dstInfo.dstAddr.toString('ascii'), 'example.com');
    strictEqual(dstInfo.dstPort.readUInt16BE(), 80);
  });

  // TODO: ipv6
});

describe('http proxy', () => {
  let dstServer;
  let ssLocalServer;
  let ssServerServer;

  before(cb => {
    ssLocalServer = ssLocal.startServer();
    ssServerServer = ssServer.startServer();
    dstServer = createHTTPServer(cb);
  });

  it('should get correct response through ipv4', function(cb) {
    this.timeout(TIMEOUT);

    const options = {
      port: DST_PORT,
      host: DST_ADDR,
      socksHost: config.localHost,
      socksPort: config.localPort,
    };

    shttp.get(options, res => {
      res.on('readable', () => {
        strictEqual(res.read().toString('utf8'), DST_RES_TEXT,
          'Responsed text is not same');
        cb();
      });
    });
  });

  it('should get correct response through ipv6', function(cb) {
    this.timeout(TIMEOUT);

    const options = {
      port: DST_PORT,
      host: '::1',
      socksHost: config.localHost,
      socksPort: config.localPort,
    };

    shttp.get(options, res => {
      res.on('readable', () => {
        strictEqual(res.read().toString('utf8'), DST_RES_TEXT,
          'Responsed text is not same');
        cb()
      });
    });
  });

  it('should get correct response when the `atyp` is `domain`', function(cb) {
    this.timeout(TIMEOUT);

    let success = false;

    shttp.get('http://example.com', res => {
      res.on('readable', () => {
        let text = res.read();

        if (text) {
          text = text.toString('utf8');
          if (~text.indexOf('Example Domain')) {
            success = true;
            cb();
          }
        }
      });

      res.on('close', () => {
        if (!success) {
          cb(new Error('failed'));
        }
      });
    });
  });

  // TODO: this test seems to be invalid
  it('should get correct response when the requesting by ssl', function(cb) {
    this.timeout(TIMEOUT);

    shttps.get('https://example.com', res => {
      res.on('readable', () => {
        let text = res.read().toString('utf8');
        assert(!!~text.indexOf('Example Domain'));
        cb();
      });
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
