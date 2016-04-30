const http = require('http');
const https = require('https');

const DST_RES_TEXT = 'hello world!';
const DST_ADDR = '127.0.0.1';
const DST_PORT = 42134;

function createHTTPServer(cb) {
  return http.createServer((req, res) => {
    res.end(DST_RES_TEXT);
  }).listen(DST_PORT, cb);
}

function createHTTPSServer() {
  //up TODO:
}

module.exports = {
  DST_PORT, DST_ADDR, DST_RES_TEXT,
  createHTTPServer,
};

if (module === require.main) {
  createHTTPServer(() => {
    console.log(`test server is running on ${DST_ADDR}:${DST_PORT}`);
  });
}
