import { createServer } from 'http';
import { getPACFileContent } from './gfwlistUtils';

const NAME = 'pac_server';

// TODO: async this
export function createPACServer(config, logger) {
  const pacFileContent = getPACFileContent(config);

  const server = createServer((req, res) => {
    res.write(pacFileContent);
    res.end();
  });

  server.listen(config.pacServerPort);

  if (logger) {
    logger.verbose(`${NAME} is listening on ${config.localAddr}:${config.pacServerPort}`);
  }

  return server;
}
