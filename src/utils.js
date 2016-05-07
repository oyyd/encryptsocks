import { join } from 'path';
import { readFileSync } from 'fs';
import minimist from 'minimist';

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

// TODO: same
export function getDstInfoFromUDPMsg(data, isServer) {
  // +----+------+------+----------+----------+----------+
  // |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
  // +----+------+------+----------+----------+----------+
  // | 2  |  1   |  1   | Variable |    2     | Variable |
  // +----+------+------+----------+----------+----------+

  const offset = isServer ? 0 : 3;

  return _getDstInfo(data, offset);
}

export function inetNtoa(buf) {
  switch (buf.length) {
    case 4:
      return `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`;
    case 16: {
      let i;
      let res = '';

      for (i = 0; i < 16; i += 2) {
        res = `${res}:${buf.readUInt16BE(i)}`;
      }

      return res.slice(1);
    } default:
      return null;
  }
}

export function inetAton(ipStr) {
  const parts = ipStr.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const buf = new Buffer(4);

  parts.forEach((part, i) => {
    buf[i] = part;
  });

  return buf;
}

export function getConfig() {
  return JSON.parse(readFileSync(join(__dirname, '../config.json')));
}

export function getDstStr(dstInfo) {
  if (!dstInfo) {
    return null;
  }

  switch (dstInfo.atyp) {
    case 1:
    case 4:
      return `${inetNtoa(dstInfo.dstAddr)}:${dstInfo.dstPort.readUInt16BE()}`;
    case 3:
      return `${dstInfo.dstAddr.toString('utf8')}:${dstInfo.dstPort.readUInt16BE()}`;
    default:
      return 'WARN: invalid atyp';
  }
}
