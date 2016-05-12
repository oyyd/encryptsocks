import path from 'path';
import minimist from 'minimist';
import { spawn } from 'child_process';
import { readFileSync, accessSync } from 'fs';

import DEFAULT_CONFIG from './defaultConfig';
import { version } from '../package.json';
import fileConfig from '../config.json';
import * as ssLocal from './ssLocal';
import * as ssServer from './ssServer';
import { getPid, writePidFile, deletePidFile } from './pid';

const PROXY_ARGUMENT_PAIR = {
  c: 'configFilePath',
  s: 'serverAddr',
  p: 'serverPort',
  l: 'localAddr',
  b: 'localPort',
  k: 'password',
  m: 'method',
  t: 'timeout',
  level: 'level',
};

const GENERAL_ARGUMENT_PAIR = {
  h: 'help',
  help: 'help',
  d: 'daemon',
};

const SPAWN_OPTIONS = {
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
};

const DAEMON_COMMAND = {
  start: 'start',
  stop: 'stop',
  restart: 'restart',
};

const log = console.log; // eslint-disable-line

function getDaemonType(isServer) {
  return isServer ? 'server' : 'local';
}

function isRunning(pid) {
  try {
    return process.kill(pid, 0);
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function getArgvOptions(argv) {
  const generalOptions = {};
  const proxyOptions = {};
  const configPair = minimist(argv);
  const optionsType = [{
    options: proxyOptions,
    keys: Object.keys(PROXY_ARGUMENT_PAIR),
    values: PROXY_ARGUMENT_PAIR,
  }, {
    options: generalOptions,
    keys: Object.keys(GENERAL_ARGUMENT_PAIR),
    values: GENERAL_ARGUMENT_PAIR,
  }];

  let invalidOption = null;

  Object.keys(configPair).forEach(key => {
    if (key === '_') {
      return;
    }

    let hit = false;

    optionsType.forEach(optType => {
      const i = optType.keys.indexOf(key);

      if (~i) {
        optType.options[optType.values[optType.keys[i]]] = configPair[key]; // eslint-disable-line
        hit = true;
      }
    });

    if (!hit) {
      invalidOption = key;
    }
  });

  if (invalidOption) {
    invalidOption = (invalidOption.length === 1) ? `-${invalidOption}` : `--${invalidOption}`;
  } else if (generalOptions.daemon
    && !!!~Object.keys(DAEMON_COMMAND).indexOf(generalOptions.daemon)) {
    invalidOption = `invalid daemon command: ${generalOptions.daemon}`;
  }

  return {
    generalOptions, proxyOptions, invalidOption,
  };
}

function readConfig(_filePath) {
  if (!_filePath) {
    return null;
  }

  const filePath = path.join(process.cwd(), _filePath);

  try {
    accessSync(filePath);
  } catch (e) {
    throw new Error(`failed to find config file in: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath));
}

export function getConfig(argv) {
  const { generalOptions, proxyOptions, invalidOption } = getArgvOptions(argv);
  const specificFileConfig = readConfig(proxyOptions.configFilePath) || fileConfig;

  return {
    generalOptions, invalidOption,
    proxyOptions: Object.assign({}, DEFAULT_CONFIG, specificFileConfig, proxyOptions),
  };
}

function logHelp(invalidOption) {
  log(
`
${(invalidOption ? `${invalidOption}\n` : null)}shadowsock-js ${version}
You can supply configurations via either config file or command line arguments.

Proxy options:
  -c config              path to config file
  -s SERVER_ADDR         server address, default: 127.0.0.1
  -p SERVER_PORT         server port, default: 8083
  -l LOCAL_ADDR          local binding address, default: 127.0.0.1
  -b LOCAL_PORT          local port, default: 1080
  -k PASSWORD            password
  -m METHOD              encryption method, default: aes-128-cfb
  -t TIMEOUT             timeout in seconds, default: 60
  --level LOG_LEVEL      log level, default: warn
                         example: --level verbose
General options:
  -h, --help             show this help message and exit
  -d start/stop/restart  daemon mode
`
  );
}

function startDaemon(isServer) {
  // TODO: `node` or with path?
  const child = spawn('node', [path.join(__dirname, 'daemon'), getDaemonType(isServer)]
    .concat(process.argv.slice(2)), SPAWN_OPTIONS);

  child.disconnect();
  // do not wait for child
  child.unref();

  writePidFile(getDaemonType(isServer), child.pid);
  log('start');

  return child;
}

function stopDaemon(isServer, pid) {
  if (pid) {
    process.kill(pid, 'SIGHUP');
    deletePidFile(getDaemonType(isServer));
    log('stop');
  } else {
    log('already stopped');
  }
}

function runDaemon(isServer, cmd) {
  let pid = getPid(getDaemonType(isServer));
  const running = isRunning(pid);

  if (pid && !running) {
    log('previous daemon unexpectedly exited');
    deletePidFile(getDaemonType(isServer));
    pid = null;
  }

  switch (cmd) {
    case DAEMON_COMMAND.start:
      if (pid) {
        log('already started');
      } else {
        startDaemon(isServer);
      }
      return;
    case DAEMON_COMMAND.stop:
      stopDaemon(isServer, pid);
      return;
    case DAEMON_COMMAND.restart:
      stopDaemon(isServer, pid);
      startDaemon(isServer);
      return;
    default:
      return;
  }
}

function runSingle(isServer, proxyOptions) {
  return isServer ? ssServer.startServer(proxyOptions) : ssLocal.startServer(proxyOptions);
}

export default function client(isServer) {
  const argv = process.argv.slice(2);
  const { generalOptions, proxyOptions, invalidOption } = getConfig(argv);

  if (generalOptions.help || invalidOption) {
    logHelp(invalidOption);
  } else if (generalOptions.daemon) {
    runDaemon(isServer, generalOptions.daemon);
  } else {
    runSingle(isServer, proxyOptions);
  }
}
