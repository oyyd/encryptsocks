/**
 * Daemon ss processes.
 * 1. start, stop, restart
 * 2. know the previous process running status
 * 3. log and logrotate
 */
import pm2 from 'pm2';
import path from 'path';
import { getConfig } from './config';
import { getFileName } from './pid';

// eslint-disable-next-line
const log = console.log

export const FORK_FILE_PATH = {
  local: path.join(__dirname, 'ssLocal.js'),
  server: path.join(__dirname, 'ssServer.js'),
};

const pm2ProcessName = {
  local: 'ssLocal',
  server: 'ssServer',
};

function getArgs() {
  return process.argv.slice(2);
}

function getDaemonInfo(type) {
  // TODO: refactor this
  const argv = getArgs();

  return new Promise((resolve) => {
    getConfig(argv, (err, config) => {
      if (err) {
        throw err;
      }

      resolve({
        type,
        config,
      });
    });
  });
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

function getPM2Config(_type) {
  return connect().then(getDaemonInfo.bind(null, _type)).then((info) => {
    const { type } = info;

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
      args: getArgs().join(' '),
    };

    return {
      info,
      pm2Config,
    };
  });
}

function _start(type) {
  return getPM2Config(type).then(({ pm2Config }) => new Promise((resolve) => {
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

export function start(type) {
  return _start(type).catch(handleError);
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

function _stop(type) {
  let config = null;

  return getPM2Config(type).then((conf) => {
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

export function stop(type) {
  return _stop(type).catch(handleError);
}

export function restart(type) {
  return _stop(type).then(() => _start(type)).catch(handleError);
}
