import { fork } from 'child_process';
import logger from './logger';
import { getConfig, logHelp } from './cli';

const NAME = 'daemon';
const MAX_RESTART_TIME = 5;

function forkProcess(config, filePath, _restartTime) {
  let restartTime = _restartTime || 0;

  const child = fork(filePath);

  child.send(config);

  setTimeout(() => {
    restartTime = 0;
  }, 60 * 1000);

  child.on('exit', () => {
    logger.warn(`${NAME}: process exit.`);

    child.kill('SIGKILL');

    if (restartTime < MAX_RESTART_TIME) {
      forkProcess(config, filePath, restartTime + 1);
    } else {
      logger.error(`${NAME}: restarted too many times, will close.`);
      process.exit(1);
    }
  });
}

export default function daemon(filePath) {
  const { generalOptions, proxyOptions } = getConfig();

  if (generalOptions.help) {
    logHelp();
  } else {
    forkProcess(proxyOptions, filePath);
  }
}

module.exports = daemon;
