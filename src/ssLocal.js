import { closeSilently, createSafeAfterHandler } from './utils';
import { createLogger, LOG_NAMES } from './logger';
import { createPACServer } from './pacServer';
import createUDPRelay from './createUDPRelay';
import { createServer } from './createLocalTCPRelay';

const NAME = 'ss_local';

let logger;

function closeAll() {
  closeSilently(this.server);
  closeSilently(this.pacServer);
  this.udpRelay.close();
}

export function startServer(config, willLogToConsole = false) {
  logger = logger || createLogger(config.level, LOG_NAMES.LOCAL, willLogToConsole);

  const server = createServer(config, logger);
  const udpRelay = createUDPRelay(config, false, logger);
  const pacServer = createPACServer(config, logger);

  return {
    server, udpRelay,
    pacServer,
    closeAll,
  };
}

if (module === require.main) {
  process.on('message', config => {
    logger = createLogger(config.level, LOG_NAMES.LOCAL, false);
    startServer(config, false);
  });

  process.on('uncaughtException', err => {
    logger.error(`${NAME} uncaughtException: ${err.stack} `, createSafeAfterHandler(logger, () => {
      process.exit(1);
    }));
  });
}
