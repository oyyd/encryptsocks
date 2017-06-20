const http = require('http');
const url = require('url');
const utils = require('../lib/gfwlistUtils');
const LOCAL_ONLY = require('./utils').LOCAL_ONLY;
const assert = require('assert');
const pacServer = require('../lib/pacServer');

const strictEqual = assert.strictEqual;
const requestGFWList = utils.requestGFWList;
const readLine = utils.readLine;
const createListArrayString = utils.createListArrayString;
const updateGFWList = utils.updateGFWList;
const createPACServer = pacServer.createPACServer;
const request = http.request;

// NOTE: this will take a lot of time
xdescribe(LOCAL_ONLY + ' requestGFWList', function() {
  this.timeout(20000);

  it('should get gfwlist', function(cb) {
    updateGFWList(err => {
      if (err) {
        throw err;
      }
      cb();
    });
  });

  it('should get gfwlist with specify url', function(cb) {
    const targetURL = 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt';

    updateGFWList(targetURL, err => {
      if (err) {
        throw err;
      }
      cb();
    });
  });
});

describe('requestGFWList', function() {
  var text = '1\n2\r3\r\n4\r';
  var text2 = '1\n';

  describe('readLine', function() {
    it('should read line correctly', function() {
      readLine.clear();
      strictEqual(readLine(text), '1\n');
      strictEqual(readLine(text), '2\r');
      strictEqual(readLine(text), '3\r\n');
      strictEqual(readLine(text), '4\r');
      strictEqual(readLine(text), null);
    });

    it('should read from start when reading a new string', function() {
      readLine.clear();
      strictEqual(readLine(text), '1\n');
      strictEqual(readLine(text), '2\r');
      strictEqual(readLine(text2), '1\n');
      strictEqual(readLine(text), '1\n');
    });

    it('should strip linebreak', function() {
      readLine.clear();
      strictEqual(readLine(text, true), '1');
      strictEqual(readLine(text, true), '2');
      strictEqual(readLine(text, true), '3');
      strictEqual(readLine(text, true), '4');
      strictEqual(readLine(text, true), null);
    });
  });

  describe('createListArrayString', function() {
    it('should return return array string', function() {
      var text = '!abc\nwww.google.com\n!www.abc.com\ngithub.com\n';
      var expected = 'var rules = ["www.google.com",\n"github.com"];';

      strictEqual(createListArrayString(text), expected);
    });
  });
});

describe('pacServer', function() {
  this.timeout(5000);

  it('should serve pac file', function(cb) {
    var localAddr = '127.0.0.1';
    var localPort = 1082;
    var pacServerPort = 8084;
    var server = createPACServer({ localAddr, localPort, pacServerPort });

    var data = '';
    var expected = 'FindProxyForURL';

    var HOST = localAddr + ':' + pacServerPort;

    request(url.parse('http://' + HOST), function(resSocket) {

      resSocket.on('data', function(chunk) {
        data = data + chunk.toString();
      });

      resSocket.on('end', function() {
        if (!!~data.indexOf(expected) && !!~data.indexOf(localAddr + ':' + localPort)) {
          server.close();
          cb(null);
          return;
        }

        server.close();
        cb(new Error('invalid'));
      });
    }).end();
  });
});
