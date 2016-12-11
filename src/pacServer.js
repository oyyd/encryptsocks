import { createServer } from 'http';
import { getPACFileContent } from './gfwlistUtils';

const NAME = 'pac_server';

// TODO: async this
export function createPACServer(config, logger) {
  const pacFileContent = getPACFileContent(config);
  const HOST = `${config.localAddr}:${config.pacServerPort}`;

  const server = createServer((req, res) => {
    res.write(pacFileContent);
    res.end();
  });

  server.on('error', (err) => {
    logger.error(`${NAME} got error: ${err.stack}`);
  });

  server.listen(config.pacServerPort);

  if (logger) {
    logger.verbose(`${NAME} is listening on ${HOST}`);
  }

  return server;
}
