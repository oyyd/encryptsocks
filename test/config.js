const assert = require('assert');
const c = require('../lib/config');
const DEFAULT_CONFIG = require('../lib/defaultConfig').default;
const ip = require('ip');

const resolveServerAddr = c.resolveServerAddr
const getConfig = c.getConfig
const stringifyProxyOptions = c.stringifyProxyOptions

describe('config', () => {
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

  describe('getConfig', () => {
    it('should force to not resolve ipv6 value when forced not to', done => {
      const argv = ['-s', 'PATH_THAT_DOES_NOT_EXIST']

      getConfig(argv, true, (err, options) => {
        assert(!err);
        assert(options.proxyOptions.serverAddr === argv[1]);
        done();
      })
    })

    it('should get `logPath` when set', (done) => {
      const argv = ['--log_path', '/logs']

      getConfig(argv, true, (err, options) => {
        assert(!err);
        assert(options.proxyOptions.logPath === argv[1]);
        done();
      })
    })

    it('should use `process.pwd()` as base when set a relative path', done => {
      const argv = ['--log_path', './logs']

      getConfig(argv, true, (err, options) => {
        assert(!err);
        assert(options.proxyOptions.logPath
          === (process.cwd() + '/logs'));
        done();
      })
    })
  })

  describe('stringifyProxyOptions', () => {
    it('should stringify proxyOptions', () => {
      const argString = stringifyProxyOptions(DEFAULT_CONFIG);

      assert(argString === '-s 0.0.0.0 -p 8083 -l 127.0.0.1 -b 1080 -k YOUR_PASSWORD_HERE --pac_port 8090 -t 600 -m aes-128-cfb --level warn --log_path /Users/liangduan/code/github/shadowsocks-js/logs')
    })
  })
});
