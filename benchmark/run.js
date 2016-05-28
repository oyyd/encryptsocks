const { createServer } = require('./createResourceServer');
const { send, SOCKS_PORT } = require('./createClients');
const { totalConnection } = require('./config');
const { conclude } = require('./conclude');

function log() {
  console.log(...arguments); // eslint-disable-line
}

if (module === require.main) {
  log(`This benchmark assumes your ss client is listening on localhost:${SOCKS_PORT}`);

  const server = createServer(() => {
    send(totalConnection, (err, data) => {
      if (err) {
        throw err;
      }

      log(conclude(data));

      server.close();
    });
  });
}
