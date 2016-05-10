import path from 'path';
import minimist from 'minimist';
import { spawn } from 'child_process';

import DEFAULT_CONFIG from './defaultConfig';
import { version } from '../package.json';
import fileConfig from '../config.json';
import * as ssLocal from './ssLocal';
import * as ssServer from './ssServer';

const PROXY_ARGUMENT_PAIR = {
  s: 'serverAddr',
  p: 'serverPort',
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
  start: 0,
  stop: 1,
  restart: 2,
};

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

export function getConfig(argv) {
  const { generalOptions, proxyOptions, invalidOption } = getArgvOptions(argv);
  const res = {
    generalOptions, invalidOption,
    proxyOptions: Object.assign({}, DEFAULT_CONFIG, fileConfig, proxyOptions),
  };

  return res;
}

function logHelp(invalidOption) {
  console.log(// eslint-disable-line
`
${(invalidOption ? `${invalidOption}\n` : null)}shadowsock-js ${version}
You can supply configurations via either config file or command line arguments.

Proxy options:
  -s SERVER_ADDR         server address, default: 127.0.0.1
  -p SERVER_PORT         server port, default: 8083
  -k PASSWORD            password
  -m METHOD              encryption method, default: aes-128-cfb
  -t TIMEOUT             timeout in seconds, default: 600

General options:
  -h, --help             show this help message and exit
  -d start/stop/restart  daemon mode
`
  );
}

function runDaemon(isServer) {
  // TODO: `node` or with path?
  const child = spawn('node', [path.join(__dirname, 'daemon'), isServer ? 'server' : 'local']
    .concat(process.argv.slice(2)), SPAWN_OPTIONS);

  child.disconnect();
  // do not wait for child
  child.unref();
}

function runSingle(isServer) {

}

export default function client(isServer) {
  const argv = process.argv.slice(2);
  const { generalOptions, invalidOption } = getConfig(argv);

  if (generalOptions.help || invalidOption) {
    logHelp(invalidOption);
  } else if (generalOptions.daemon) {
    runDaemon();
  } else {
    runSingle();
  }
}
