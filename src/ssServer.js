import { createSafeAfterHandler, closeSilently } from './utils';
import { createLogger, LOG_NAMES } from './logger';
import { INTERVAL_TIME } from './recordMemoryUsage';
import { createServer } from './createServerTCPRelay';
import createUDPRelay from './createUDPRelay';

const NAME = 'ss_server';

let logger;

function closeAll() {
  closeSilently(this.udpRelay);
  this.tcpRelay.close();
}

export function startServer(config, willLogToConsole = false) {
  logger = logger || createLogger(config.level, LOG_NAMES.SERVER, willLogToConsole);

  const tcpRelay = createServer(config, logger);
  const udpRelay = createUDPRelay(config, true, logger);

  return {
    tcpRelay, udpRelay, closeAll,
  };
}

if (module === require.main) {
  process.on('message', config => {
    logger = createLogger(config.level, LOG_NAMES.SERVER, false);

    startServer(config, false);

    // NOTE: DEV only
    if (config._recordMemoryUsage) {
      setInterval(() => {
        process.send(process.memoryUsage());
      }, INTERVAL_TIME);
    }
  });

  process.on('uncaughtException', err => {
    logger.error(`${NAME} uncaughtException: ${err.stack}`, createSafeAfterHandler(logger, () => {
      process.exit(1);
    }));
  });
}
