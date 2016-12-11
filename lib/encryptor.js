'use strict';

exports.__esModule = true;
exports.getParamLength = getParamLength;
exports.generateKey = generateKey;
exports.createCipher = createCipher;
exports.createDecipher = createDecipher;
exports.encrypt = encrypt;
exports.decrypt = decrypt;

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var hasOwnProperty = {}.hasOwnProperty;

// directly exported from shadowsocks-nodejs
var cryptoParamLength = {
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
  'seed-cfb': [16, 16]
};

var keyCache = {};

function getParamLength(methodName) {
  return cryptoParamLength[methodName];
}

function getMD5Hash(data) {
  return _crypto2.default.createHash('md5').update(data).digest();
}

function generateKey(methodName, secret) {
  var secretBuf = new Buffer(secret, 'utf8');
  var tokens = [];
  var keyLength = getParamLength(methodName)[0];
  var cacheIndex = methodName + '_' + secret;

  var i = 0;
  var hash = void 0;
  var length = 0;

  if (hasOwnProperty.call(keyCache, cacheIndex)) {
    return keyCache[cacheIndex];
  }

  if (!keyLength) {
    // TODO: catch error
    throw new Error('unsupported method');
  }

  while (length < keyLength) {
    hash = getMD5Hash(i === 0 ? secretBuf : Buffer.concat([tokens[i - 1], secretBuf]));
    tokens.push(hash);
    i += 1;
    length += hash.length;
  }

  hash = Buffer.concat(tokens).slice(0, keyLength);

  keyCache[cacheIndex] = hash;

  return hash;
}

function createCipher(secret, methodName, initialData, _iv) {
  var key = generateKey(methodName, secret);
  var iv = _iv || _crypto2.default.randomBytes(getParamLength(methodName)[1]);
  var cipher = _crypto2.default.createCipheriv(methodName, key, iv);

  return {
    cipher: cipher,
    data: Buffer.concat([iv, cipher.update(initialData)])
  };
}

function createDecipher(secret, methodName, initialData) {
  var ivLength = getParamLength(methodName)[1];
  var iv = initialData.slice(0, ivLength);

  if (iv.length !== ivLength) {
    return null;
  }

  var key = generateKey(methodName, secret);
  var decipher = _crypto2.default.createDecipheriv(methodName, key, iv);
  var data = decipher.update(initialData.slice(ivLength));

  return {
    decipher: decipher,
    data: data
  };
}

function encrypt(secret, methodName, data, _iv) {
  return createCipher(secret, methodName, data, _iv).data;
}

function decrypt(secret, methodName, data) {
  return createDecipher(secret, methodName, data).data;
}
