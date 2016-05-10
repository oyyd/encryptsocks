import { fork } from 'child_process';
import logger from './logger';
import { getConfig } from './cli';

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
  const { proxyOptions } = getConfig();

  forkProcess(proxyOptions, filePath);
}

console.log('yes');

try {
  if (module === require.main) {
    const type = process.argv[2];
    const argv = process.argv.slice(3);
    const { proxyOptions } = getConfig(argv);

    console.log('yes');

    process.on('message', msg => {
      console.log(`daemon get msg: ${msg}`);
      require('fs').writeFileSync('./test.txt', msg);
    });

    setTimeout(() => {

    }, 1000000000);
  }

  setTimeout(() => {

  }, 1000000000);
} catch(e) {
  require('fs').writeFileSync('./test.txt', e.stack);
  console.log(e.stack);
}
