'use strict';

const shttp = require('socks5-http-client');
const http = require('http');
const assert = require('assert');

const ssLocal = require('../lib/ssLocal');
const utils = require('../lib/utils');

const DST_ADDR = '127.0.0.1';
const DST_PORT = 42134;
const DST_RES_TEXT = 'hello world!';
const strictEqual = assert.strictEqual;
const getDstInfo = ssLocal.getDstInfo;

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
    strictEqual(utils.inetNtoa(dstInfo.dstAddr), '127.0.0.1');
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
  let dstServer,
    ssLocalServer;

  before(cb => {
    dstServer = http.createServer((req, res) => {
      res.end(DST_RES_TEXT);
    }).listen(DST_PORT, cb);

    ssLocalServer = ssLocal.startServer();
  });

  it('should get correct response through ipv4', cb => {
    const options = {
      port: DST_PORT,
      host: DST_ADDR,
    };

    shttp.get(options, res => {
      res.on('readable', () => {
        strictEqual(res.read().toString('utf8'), DST_RES_TEXT,
          'Responsed text is not same');
        cb();
      });
    });
  });

  xit('should get correct response through domain', cb => {
    shttp.get('http://example.com', res => {
      console.log('res');

      res.on('readable', () => {
        let text = res.read().toString('utf8');
        assert(!!~text.indexOf('Example Domain'));
        cb();
      });
    });
  });

  after(() => {
    dstServer.close();
    ssLocalServer.close();
  });
});
