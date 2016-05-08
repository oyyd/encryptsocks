import minimist from 'minimist';
import ip from 'ip';
import config from '../config.json';

const DEFAULT_CONFIG = {
  serverAddr: '127.0.0.1',
  serverPort: 8083,
  localAddr: '127.0.0.1',
  localPort: 1080,
  password: 'YOUR_PASSWORD_HERE',
  timeout: 600,
  method: 'aes-128-cfb',

  level: 'warn',
  localAddrIPv6: '::1',
  serverAddrIPv6: '::1',
};

export function sendDgram(socket, data, ...args) {
  socket.send(data, 0, data.length, ...args);
}

export function getArgv() {
  return minimist(process.argv.slice(2));
}

export function writeOrPause(fromCon, toCon, data) {
  const res = toCon.write(data);

  if (!res) {
    fromCon.pause();
  }

  return res;
}

function _getDstInfo(data, offset) {
  const atyp = data[offset];

  let dstAddr;
  let dstPort;
  let dstAddrLength;
  let dstPortIndex;
  let dstPortEnd;
  // length of non-data field
  let totalLength;

  switch (atyp) {
    case 0x01:
      dstAddrLength = 4;
      dstAddr = data.slice(offset + 1, offset + 5);
      dstPort = data.slice(offset + 5, offset + 7);
      totalLength = offset + 7;
      break;
    case 0x04:
      dstAddrLength = 16;
      dstAddr = data.slice(offset + 1, offset + 17);
      dstPort = data.slice(offset + 17, offset + 19);
      totalLength = offset + 19;
      break;
    case 0x03:
      dstAddrLength = data[offset + 1];
      dstPortIndex = 2 + offset + dstAddrLength;
      dstAddr = data.slice(offset + 2, dstPortIndex);
      dstPortEnd = dstPortIndex + 2;
      dstPort = data.slice(dstPortIndex, dstPortEnd);
      totalLength = dstPortEnd;
      break;
    default:
      return null;
  }

  return {
    atyp, dstAddrLength, dstAddr, dstPort,
    totalLength,
  };
}

export function getDstInfo(data, isServer) {
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  // Yet shadowsocks begin with ATYP.

  const offset = isServer ? 0 : 3;
  return _getDstInfo(data, offset);
}

export function getDstInfoFromUDPMsg(data, isServer) {
  // +----+------+------+----------+----------+----------+
  // |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
  // +----+------+------+----------+----------+----------+
  // | 2  |  1   |  1   | Variable |    2     | Variable |
  // +----+------+------+----------+----------+----------+

  const offset = isServer ? 0 : 3;

  return _getDstInfo(data, offset);
}

export function getConfig() {
  return Object.assign({}, DEFAULT_CONFIG, config);
}

export function getDstStr(dstInfo) {
  if (!dstInfo) {
    return null;
  }

  switch (dstInfo.atyp) {
    case 1:
    case 4:
      return `${ip.toString(dstInfo.dstAddr)}:${dstInfo.dstPort.readUInt16BE()}`;
    case 3:
      return `${dstInfo.dstAddr.toString('utf8')}:${dstInfo.dstPort.readUInt16BE()}`;
    default:
      return 'WARN: invalid atyp';
  }
}
