/**
 * ```
 * $ node lib/daemon local -d restart
 * ```
 *
 * ```
 * $ node lib/daemon server -d restart -k abc
 * ```
 */
import { join } from 'path';
import { fork } from 'child_process';
import { createLogger, LOG_NAMES } from './logger';
import { getConfig } from './cli';
import { deletePidFile } from './pid';
import { record, stopRecord } from './recordMemoryUsage';
import { createSafeAfterHandler, safelyKillChild } from './utils';

const NAME = 'daemon';
// TODO:
// const MAX_RESTART_TIME = 5;
const MAX_RESTART_TIME = 1;

let child = null;
let logger;
let shouldStop = false;

// eslint-disable-next-line
export const FORK_FILE_PATH = {
  local: join(__dirname, 'ssLocal'),
  server: join(__dirname, 'ssServer'),
};

function daemon(type, config, filePath, shouldRecordServerMemory, _restartTime) {
  let restartTime = _restartTime || 0;

  child = fork(filePath);

  if (shouldRecordServerMemory) {
    child.on('message', record);
  }

  child.send(config);

  setTimeout(() => {
    restartTime = 0;
  }, 60 * 1000);

  child.on('exit', () => {
    if (shouldStop) {
      return;
    }

    logger.warn(`${NAME}: process exit.`);

    safelyKillChild(child, 'SIGKILL');

    if (restartTime < MAX_RESTART_TIME) {
      daemon(type, config, filePath, shouldRecordServerMemory, restartTime + 1);
    } else {
      logger.error(
        `${NAME}: restarted too many times, will close.`,
        createSafeAfterHandler(logger, () => {
          deletePidFile(type);
          process.exit(1);
        })
      );
    }
  });
}

if (module === require.main) {
  const type = process.argv[2];
  const argv = process.argv.slice(3);

  getConfig(argv, (err, config) => {
    const { proxyOptions } = config;
    // eslint-disable-next-line
    const shouldRecordServerMemory = proxyOptions['_recordMemoryUsage'] && type === 'server';

    logger = createLogger(proxyOptions.level, LOG_NAMES.DAEMON, false);

    if (err) {
      logger.error(`${NAME}: ${err.message}`);
    }

    daemon(type, proxyOptions, FORK_FILE_PATH[type], shouldRecordServerMemory);

    process.on('SIGHUP', () => {
      shouldStop = true;

      if (child) {
        safelyKillChild(child, 'SIGKILL');
      }

      deletePidFile(type);

      if (shouldRecordServerMemory) {
        stopRecord();
      }

      process.exit(0);
    });

    process.on('uncaughtException', (uncaughtErr) => {
      logger.error(`${NAME} get error:\n${uncaughtErr.stack}`,
        createSafeAfterHandler(logger, () => {
          process.exit(1);
        }));
    });
  });
}
