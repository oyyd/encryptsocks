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
