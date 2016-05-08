import minimist from 'minimist';
import DEFAULT_CONFIG from './defaultConfig';
import { version } from '../package.json';

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
};

function getArgvOptions() {
  const generalOptions = {};
  const proxyOptions = {};
  const configPair = minimist(process.argv.slice(2));

  const optionsType = [{
    options: proxyOptions,
    keys: Object.keys(PROXY_ARGUMENT_PAIR),
    values: PROXY_ARGUMENT_PAIR,
  }, {
    options: generalOptions,
    keys: Object.keys(GENERAL_ARGUMENT_PAIR),
    values: GENERAL_ARGUMENT_PAIR,
  }];

  Object.keys(configPair).forEach(key => {
    optionsType.forEach(optType => {
      const i = optType.keys.indexOf(key);

      if (~i) {
        optType.options[optType.values[optType.keys[i]]] = configPair[key]; // eslint-disable-line
      }
    });
  });

  return {
    generalOptions, proxyOptions,
  };
}

export function getConfig() {
  const { generalOptions, proxyOptions } = getArgvOptions();
  const res = {
    generalOptions,
    proxyOptions: Object.assign({}, DEFAULT_CONFIG, proxyOptions),
  };

  return res;
}

export function logHelp() {
  console.log(// eslint-disable-line
`
shadowsock-js ${version}
You can supply configurations via either config file or command line arguments.

Proxy options:
  -s SERVER_ADDR         server address, default: 127.0.0.1
  -p SERVER_PORT         server port, default: 8083
  -k PASSWORD            password
  -m METHOD              encryption method, default: aes-128-cfb
  -t TIMEOUT             timeout in seconds, default: 600

General options:
  -h, --help             show this help message and exit
`
  );
}
