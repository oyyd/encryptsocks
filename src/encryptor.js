import crypto from 'crypto';

// TODO: directly export from shadowsocks-nodejs
const cryptoParamLength = {
  'aes-128-cfb': [16, 16],
  'aes-192-cfb': [24, 16],
  'aes-256-cfb': [32, 16],
  'bf-cfb': [16, 8],
  'camellia-128-cfb': [16, 16],
  'camellia-192-cfb': [24, 16],
  'camellia-256-cfb': [32, 16],
  'cast5-cfb': [16, 8],
  'des-cfb': [8, 8],
  'idea-cfb': [16, 8],
  'rc2-cfb': [16, 8],
  rc4: [16, 0],
  'rc4-md5': [16, 16],
  'seed-cfb': [16, 16],
};

const keyCache = {};

export function getParamLength(methodName) {
  return cryptoParamLength[methodName];
}

function getMD5Hash(data) {
  return crypto.createHash('md5').update(data).digest();
}

export function generateKey(methodName, secret) {
  const secretBuf = new Buffer(secret, 'utf8');
  const tokens = [];
  const keyLength = getParamLength(methodName)[0];
  const cacheIndex = `${methodName}_${secret}`;

  let i = 0;
  let hash;
  let length = 0;

  if (keyCache.hasOwnProperty(cacheIndex)) {
    return keyCache[cacheIndex];
  }

  if (!keyLength) {
    // TODO: catch error
    throw new Error('unsupported method');
  }

  while (length < keyLength) {
    hash = getMD5Hash((i === 0) ? secretBuf : Buffer.concat([tokens[i - 1], secretBuf]));
    tokens.push(hash);
    i ++;
    length += hash.length;
  }

  hash = Buffer.concat(tokens).slice(0, keyLength);

  keyCache[cacheIndex] = hash;

  return hash;
}

export function createCipher(secret, methodName, initialData, _iv) {
  const key = generateKey(methodName, secret);
  const iv = _iv || crypto.randomBytes(getParamLength(methodName)[1]);
  const cipher = crypto.createCipheriv(methodName, key, iv);

  return {
    cipher,
    data: Buffer.concat([iv, cipher.update(initialData)]),
  };
}

export function createDecipher(secret, methodName, initialData) {
  const key = generateKey(methodName, secret);
  const ivLength = getParamLength(methodName)[1];
  const iv = initialData.slice(0, ivLength);
  const decipher = crypto.createDecipheriv(methodName, key, iv);

  return {
    decipher,
    data: decipher.update(initialData.slice(ivLength)),
  };
}
