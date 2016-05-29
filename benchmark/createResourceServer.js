const http = require('http');
const { fileSize } = require('./config');

const PORT = 8808;
const RESPONSE = Buffer.alloc(fileSize * 1024, '0');

function createServer(next) {
  let total = 0;

  const logInterval = setInterval(() => {
    console.log(`receive total: ${total}`);
  }, 1000);

  const server = http.createServer((req, res) => {
    res.end(RESPONSE);
  });

  // console.log('2');

  server.on('connection', () => {
    total += 1;
  });

  server.listen(PORT, next);

  server.on('close', () => {
    clearInterval(logInterval);
  });

  console.log(`listen on ${PORT}`); // eslint-disable-line

  return server;
}

module.exports = {
  createServer, PORT,
  RESPONSE,
};

if (module === require.main) {
  createServer();
}
