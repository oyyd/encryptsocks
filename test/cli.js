const assert = require('assert');
const cli = require('../lib/cli');
const ip = require('ip');

const resolveServerAddr = cli.resolveServerAddr;

describe('cli', () => {
  describe('resolveServerAddr', () => {
    it('should keep the ivp4 `serverAddr`', done => {
      const config = {
        proxyOptions: {
          serverAddr: '127.0.0.1',
        },
      };

      resolveServerAddr(config, (err, newConfig) => {
        assert.strictEqual(newConfig.proxyOptions.serverAddr, '127.0.0.1');
        done();
      });
    });

    it('should get correct ipv4 value' , done => {
      const config = {
        proxyOptions: {
          serverAddr: 'example.com',
        },
      };

      resolveServerAddr(config, (err, newConfig) => {
        assert(ip.isV4Format(newConfig.proxyOptions.serverAddr));
        done();
      });
    });

    it('should throw when resolve invalid domain' , done => {
      const config = {
        proxyOptions: {
          serverAddr: 'PATH_THAT_DOES_NOT_EXIST',
        },
      };

      resolveServerAddr(config, err => {
        assert(err.message.indexOf('failed to resolve \'serverAddr\'') > -1);
        done();
      });
    });
  });
});
