/**
 * Daemon ss processes.
 * 1. start, stop, restart
 * 2. know the previous process running status
 */
import pm2 from 'pm2';
import path from 'path';
import { getConfig } from './config';
import { getFileName } from './pid';

export const FORK_FILE_PATH = {
  local: path.join(__dirname, 'ssLocal.js'),
  server: path.join(__dirname, 'ssServer.js'),
};

const pm2ProcessName = {
  local: 'ssLocal',
  server: 'ssServer',
};

function getDaemonInfo() {
  const type = process.argv[2];
  const argv = process.argv.slice(3);

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
  // TODO:
  // eslint-disable-next-line
  console.error(err);
}

function sendDataToPMId(id, data) {
  return connect().then(() => pm2.sendDataToProcessId(id, {
    type: 'process:msg',
    data,
  }));
}

function getPM2Config() {
  return connect().then(getDaemonInfo).then((info) => {
    const { type } = info;

    const filePath = FORK_FILE_PATH[type];
    const pidFileName = getFileName(type);
    const name = pm2ProcessName[type];

    const pm2Config = {
      name,
      script: filePath,
      exec_mode: 'fork',
      instances: 1,
      pid_file: pidFileName,
      args: process.argv.slice(3).join(' '),
    };

    return {
      info,
      pm2Config,
    };
  });
}

function start() {
  let config = null;

  return getPM2Config().then(({ pm2Config, info }) => {
    config = info.config;

    return new Promise((resolve) => {
      pm2.start(pm2Config, (err, apps) => {
        if (err) {
          throw err;
        }

        resolve(apps);
      });
    });
  }).then((apps) => {
    if (!Array.isArray(apps) || apps.length < 1) {
      throw new Error('failed to exec scripts');
    }

    const app = apps[0];
    const { pm_id } = app.pm2_env;
    const { proxyOptions } = config;

    return sendDataToPMId(pm_id, proxyOptions);
  })
    .then(() => disconnect())
    .catch(handleError);
}

export function stop() {
  return getPM2Config().then(({ info }) => {
    const { type } = info;
    const name = pm2ProcessName[type];

    return new Promise((resolve) => {
      pm2.stop(name, (err) => {
        if (err) {
          throw err;
        }

        resolve();
      });
    });
  })
    .then(() => disconnect())
    .catch(handleError);
}

export function get() {

}

if (require.main === module) {
  start();
}
