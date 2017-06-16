/**
 * Daemon ss processes.
 * 1. start, stop, restart
 * 2. know the previous process running status
 */
import pm2 from 'pm2';
import path from 'path';
import { getConfig } from './cli';
import { getFileName } from './pid';

export const FORK_FILE_PATH = {
  local: path.join(__dirname, 'ssLocal.js'),
  server: path.join(__dirname, 'ssServer.js'),
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

class Daemon {
  constructor({ type, config }) {
    this.type = type;
    this.config = config;
  }

  start() {
    let type = null;
    let config = null;

    return connect().then(getDaemonInfo).then((info) => {
      config = info.config;
      type = info.type;

      const filePath = FORK_FILE_PATH[type];
      const pidFileName = getFileName(type);

      const pm2Config = {
        script: filePath,
        exec_mode: 'fork',
        instances: 1,
        pid_file: pidFileName,
      };

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

  stop() {

  }

  restart() {

  }
}

// eslint-disable-next-line
export function getDaemon(type, config) {
  return new Daemon({ type, config });
}

if (require.main === module) {
  getDaemon().start();
}
