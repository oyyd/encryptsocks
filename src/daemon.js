import { join } from 'path';
import { fork } from 'child_process';
import { createLogger, LOG_NAMES } from './logger';
import { getConfig } from './cli';
import { deletePidFile } from './pid';
import { record, stopRecord } from './recordMemoryUsage';

const NAME = 'daemon';
const MAX_RESTART_TIME = 5;

let child = null;
let logger;

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
    logger.warn(`${NAME}: process exit.`);

    child.kill('SIGKILL');

    if (restartTime < MAX_RESTART_TIME) {
      daemon(type, config, filePath, shouldRecordServerMemory, restartTime + 1);
    } else {
      logger.error(`${NAME}: restarted too many times, will close.`);
      deletePidFile(type);
      process.exit(1);
    }
  });
}

if (module === require.main) {
  const type = process.argv[2];
  const argv = process.argv.slice(3);
  const { proxyOptions } = getConfig(argv);
  const shouldRecordServerMemory = proxyOptions._recordMemoryUsage && type === 'server';

  logger = createLogger(proxyOptions.level, LOG_NAMES.DAEMON, false);

  process.on('SIGHUP', () => {
    stopRecord();
    process.exit(0);
  });

  daemon(type, proxyOptions, FORK_FILE_PATH[type], shouldRecordServerMemory);

  process.on('SIGHUP', () => {
    if (child) {
      child.kill('SIGKILL');
    }

    deletePidFile(type);

    if (shouldRecordServerMemory) {
      stopRecord();
    }

    process.exit(0);
  });

  process.on('uncaughtException', err => {
    logger.error(`${NAME} get error:\n${err.stack}`);
  });
}
