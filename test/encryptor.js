const encryptor = require('../lib/encryptor');
const assert = require('assert');

const strictEqual = assert.strictEqual;

describe('encryptor', () => {
  var bufBinary = '0101010101010101';
  var password = 'a';
  var crypted = '\u0019"\u0006hL\f|BX`Es$8Db';
  var buf = new Buffer(8);
  var methodName = 'aes-192-cfb';
  buf.write(bufBinary, 'hex');

  it('should generate key from password', () => {
    var key = encryptor.generateKey(methodName, password)
                .toString('hex');

    strictEqual(key, '0cc175b9c0f1b6a831c399e269772661cec520ea51ea0a47');
  });

  it('should encrypt data correctly', () => {
    var initialData = 'Hello World';
    var expected = '00000000000000000000000000000000a4d373d22eaa7784c76825';
    var iv = new Buffer(encryptor.getParamLength(methodName)[1]);
    iv.fill(0);
    var tmp = encryptor.createCipher(
      password, methodName,
      new Buffer(initialData, 'utf8'),
      iv
    );

    assert(!!tmp.cipher);
    strictEqual(tmp.data.toString('hex'), expected);

    var tmp2 = encryptor.createDecipher(
      password, methodName,
      tmp.data
    );

    strictEqual(tmp2.data.toString('utf8'), initialData);
  });
});
