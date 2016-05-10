import { join } from 'path';
import { fork } from 'child_process';
import logger from './logger';
import { getConfig } from './cli';
import { deletePidFile } from './pid';

const NAME = 'daemon';
const MAX_RESTART_TIME = 5;

let child = null;

export const FORK_FILE_PATH = {
  local: join(__dirname, 'ssLocal'),
  server: join(__dirname, 'ssServer'),
};

function daemon(type, config, filePath, _restartTime) {
  let restartTime = _restartTime || 0;

  child = fork(filePath);

  child.send(config);

  setTimeout(() => {
    restartTime = 0;
  }, 60 * 1000);

  child.on('exit', () => {
    logger.warn(`${NAME}: process exit.`);

    child.kill('SIGKILL');

    if (restartTime < MAX_RESTART_TIME) {
      daemon(type, config, filePath, restartTime + 1);
    } else {
      logger.error(`${NAME}: restarted too many times, will close.`);
      deletePidFile(type);
      process.exit(1);
    }
  });
}

process.on('SIGHUP', () => {
  if (child) {
    child.kill('SIGKILL');
  }
  deletePidFile();
  process.exit(0);
});

if (module === require.main) {
  const type = process.argv[2];
  const argv = process.argv.slice(3);
  const { proxyOptions } = getConfig(argv);

  daemon(type, proxyOptions, FORK_FILE_PATH[type]);
}
