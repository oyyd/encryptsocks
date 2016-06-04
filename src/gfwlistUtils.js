// NOTE: do not use these in local server
import { join } from 'path';
import { request } from 'https';
import { parse } from 'url';
import { writeFile, readFileSync } from 'fs';
import { minify } from 'uglify-js';

const DEFAULT_CONFIG = {
  localAddr: '127.0.0.1',
  localPort: '1080',
};
const TARGET_URL = 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt';
const LINE_DELIMER = ['\r\n', '\r', '\n'];
const MINIFY_OPTIONS = {
  fromString: true,
};

let _readLineLastContent = null;
let _readLineLastIndex = 0;

function _clear() {
  _readLineLastContent = null;
  _readLineLastIndex = 0;
}

export function readLine(text, shouldStrip) {
  let startIndex = 0;
  let i = null;
  let delimer = null;

  if (text === _readLineLastContent) {
    startIndex = _readLineLastIndex;
  } else {
    _readLineLastContent = text;
  }

  LINE_DELIMER.forEach(char => {
    const index = text.indexOf(char, startIndex);

    if (index !== -1 && (i === null || index < i)) {
      i = index;
      delimer = char;
    }
  });

  if (i !== null) {
    _readLineLastIndex = i + delimer.length;
    return shouldStrip ? text.slice(startIndex, i) : text.slice(startIndex, _readLineLastIndex);
  }

  _readLineLastIndex = 0;
  return null;
}

readLine._clear = _clear;

function shouldDropLine(line) {
  // NOTE: It's possible that gfwlist has rules that is a too long
  // regexp that may crush proxies like 'SwitchySharp' so we would
  // drop these rules here.
  return !line || line[0] === '!' || line[0] === '[' || line.length > 100;
}

const slashReg = /\//g;

function encode(line) {
  return line.replace(slashReg, '\\/');
}

export function createListArrayString(text) {
  const list = [];
  let line = readLine(text, true);

  while (line !== null) {
    if (!shouldDropLine(line)) {
      list.push(`"${encode(line)}"`);
    }

    line = readLine(text, true);
  }

  return `var rules = [${list.join(',\n')}];`;
}

export function createPACFileContent(text, { localAddr, localPort }) {
  const HOST = `${localAddr}:${localPort}`;
  const readFileOptions = { encoding: 'utf8' };
  const userRulesString = readFileSync(join(__dirname, '../pac/user.txt'), readFileOptions);
  const rulesString = createListArrayString(`${userRulesString}\n${text}`);
  const SOCKS_STR = `var proxy = "SOCKS5 ${HOST}; SOCKS ${HOST}; DIRECT;";`;
  const matcherString = readFileSync(join(__dirname, '../vendor/ADPMatcher.js'), readFileOptions);

  return `${SOCKS_STR}\n${rulesString}\n${matcherString}`;
}

export function requestGFWList(next) {
  const req = request(parse(TARGET_URL), res => {
    let data = null;

    res.on('data', chunk => {
      data = data ? Buffer.concat([data, chunk]) : chunk;
    });

    res.on('end', () => {
      // gfwlist.txt use utf8 encoded content to present base64 content
      const listText = Buffer.from(data.toString(), 'base64');
      next(null, listText);
    });
  });

  req.on('error', err => {
    next(err);
  });

  req.end();
}

function minifyCode(code) {
  return minify(code, MINIFY_OPTIONS).code;
}

// TODO: async this
export function getPACFileContent(_config) {
  const config = _config || DEFAULT_CONFIG;
  const listText = readFileSync(join(__dirname, '../pac/gfwlist.txt'), { encoding: 'utf8' });

  return minifyCode(createPACFileContent(listText, config));
}

function writeGFWList(listBuffer, next) {
  writeFile(join(__dirname, '../pac/gfwlist.txt'), listBuffer, next);
}

export function updateGFWList(next) {
  requestGFWList((err, listBuffer) => {
    if (err) {
      next(err);
      return;
    }

    writeGFWList(listBuffer, next);
  });
}
