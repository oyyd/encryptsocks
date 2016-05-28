const http = require('http');

const PORT = 8808;
const RESPONSE = Buffer.alloc(1024 * 512, '0');

function createServer(next) {
  let total = 0;
  let current = 0;

  const logInterval = setInterval(() => {
    console.log(`total: ${total}, current: ${current}, memory: ${process.memoryUsage().rss / 1024 / 1024}`);
  }, 1000);

  const server = http.createServer((req, res) => {
    res.once('finish', () => {
      current -= 1;
    });
    res.end(RESPONSE);
  });

  // console.log('2');

  server.on('connection', () => {
    total += 1;
    current += 1;
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
