import { join } from 'path';
import { readFileSync } from 'fs';

export function getDstInfo(data) {
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  const atyp = data[3];

  let dstAddr;
  let dstPort;
  let dstAddrLength;
  let dstPortIndex;
  let dstPortEnd;
  let totalLength;

  switch (atyp) {
    case 0x01:
      dstAddrLength = 4;
      dstAddr = data.slice(4, 8);
      dstPort = data.slice(8, 10);
      totalLength = 10;
      break;
    case 0x04:
      dstAddrLength = 16;
      dstAddr = data.slice(4, 20);
      dstPort = data.slice(20, 22);
      totalLength = 22;
      break;
    case 0x03:
      dstAddrLength = data[4];
      dstPortIndex = 5 + dstAddrLength;
      dstAddr = data.slice(5, dstPortIndex);
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

export function inetNtoa(buf) {
  return `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`;
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
