/**
 * Daemon ss processes.
 * 1. start, stop, restart
 * 2. know the previous process running status
 * 3. log and logrotate
 */
import pm2 from 'pm2';
import path from 'path';
import { getFileName } from './pid';
import { stringifyProxyOptions } from './config';

// eslint-disable-next-line
const log = console.log

// const LOG_ROTATE_OPTIONS = {
//   maxSize: '1KB',
//   retain: 7,
//   workerInterval: 60,
//   rotateInterval: '*/1 * * * *',
// };

export const FORK_FILE_PATH = {
  local: path.join(__dirname, 'ssLocal.js'),
  server: path.join(__dirname, 'ssServer.js'),
};

const pm2ProcessName = {
  local: 'ssLocal',
  server: 'ssServer',
};

function getArgs(extralProxyOptions) {
  if (typeof extralProxyOptions === 'string') {
    return extralProxyOptions;
  }

  // TODO: support "stringify"
  if (typeof extralProxyOptions === 'object') {
    return stringifyProxyOptions(extralProxyOptions);
  }

  return process.argv.slice(2).join(' ');
}

function disconnect() {
  return new Promise((resolve) => {
    pm2.disconnect((err) => {
      if (err) {
        throw err;
      }

      resolve();
    });
  });
}

function connect() {
  return new Promise((resolve) => {
    pm2.connect((err) => {
      if (err) {
        throw err;
      }

      resolve();
    });
  });
}

function handleError(err) {
  return disconnect().then(() => {
    // TODO:
    // eslint-disable-next-line
    console.error(err);
  });
}

function getPM2Config(type, extralProxyOptions) {
  return connect().then(() => {
    const filePath = FORK_FILE_PATH[type];
    const pidFileName = getFileName(type);
    const name = pm2ProcessName[type];

    const pm2Config = {
      name,
      script: filePath,
      exec_mode: 'fork',
      instances: 1,
      output: path.resolve(__dirname, `../logs/${name}.log`),
      error: path.resolve(__dirname, `../logs/${name}.err`),
      pid: pidFileName,
      minUptime: 2000,
      maxRestarts: 3,
      args: getArgs(extralProxyOptions),
    };

    return {
      pm2Config,
    };
  });
}

function _start(type, extralProxyOptions) {
  return getPM2Config(type, extralProxyOptions)
    .then(({ pm2Config }) => new Promise((resolve) => {
      pm2.start(pm2Config, (err, apps) => {
        if (err) {
          throw err;
        }

        log('start');
        resolve(apps);
      });
    }))
    .then(() => disconnect());
}

function getRunningInfo(name) {
  return new Promise((resolve) => {
    pm2.describe(name, (err, descriptions) => {
      if (err) {
        throw err;
      }

      // TODO: there should not be more than one process
      //  “online”, “stopping”,
      //  “stopped”, “launching”,
      //  “errored”, or “one-launch-status”
      const status = descriptions.length > 0
        && descriptions[0].pm2_env.status !== 'stopped'
        && descriptions[0].pm2_env.status !== 'errored';

      resolve(status);
    });
  });
}

function _stop(type, extralProxyOptions) {
  let config = null;

  return getPM2Config(type, extralProxyOptions)
  .then((conf) => {
    config = conf;
    const { name } = config.pm2Config;
    return getRunningInfo(name);
  }).then((isRunning) => {
    const { pm2Config } = config;
    const { name } = pm2Config;

    if (!isRunning) {
      log('already stopped');
      return;
    }

    // eslint-disable-next-line
    return new Promise((resolve) => {
      pm2.stop(name, (err) => {
        if (err && err.message !== 'process name not found') {
          throw err;
        }

        log('stop');
        resolve();
      });
    });
  })
    .then(() => disconnect());
}

/**
 * @public
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
export function start(...args) {
  return _start(...args).catch(handleError);
}

/**
 * @public
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
export function stop(...args) {
  return _stop(...args).catch(handleError);
}

/**
 * @public
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
export function restart(...args) {
  return _stop(...args).then(() => _start(...args)).catch(handleError);
}

// if (module === require.main) {
//   restart('local', {
//     password: 'holic123',
//     serverAddr: 'kr.oyyd.net',
//   });
// }
