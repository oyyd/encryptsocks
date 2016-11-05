'use strict';

const assert = require('assert');
const auth = require('../lib/auth');
const usernamePasswordAuthetication = require('../lib/ssLocal').usernamePasswordAuthetication;
const BufferFrom = require('../lib/utils').BufferFrom;

const createAuthInfo = auth.createAuthInfo;
const validate = auth.validate;

function createMockConnection() {
  let writeCalledWith = null;

  const mockConnection = {
    getWriteCalled: () => writeCalledWith,
    write: function() {
      writeCalledWith = arguments;
    },
    end: () => {},
  };

  return mockConnection;
}

describe('auth', () => {
  describe('createAuthInfo', () => {

    it('should return an object containe a "info" key and the info value contain a "forceAuth" key '
      + 'and also a usernamePassword key', () => {
      const config = {
        auth: {
          forceAuth: true,
          usernamePassword: {
            abc: 'abc',
          },
        },
      };

      const res = createAuthInfo(config);
      assert(res.info);
      assert(res.info.forceAuth);
      assert.strictEqual(res.info.usernamePassword, config.auth.usernamePassword);
    });
  });

  describe('validate', () => {
    const config = {
      auth: {
        forceAuth: true,
        usernamePassword: {
          abc: '123',
        },
      },
    };
    const res = createAuthInfo(config);

    it('should pass the validation', () => {
      assert(validate(res.info, 'abc', '123'));
    });

    it('should fail the validation', () => {
      assert(!validate(res.info, 'abc', '234'));
      assert(!validate(res.info, 'bcd', '123'));
    });
  });

  describe('usernamePasswordAuthetication', () => {
    it('should deny the request with invalid username/password', () => {
      const config = {
        auth: {
          forceAuth: true,
          usernamePassword: {
            abc: '123',
          },
        },
      };
      const connection = createMockConnection();
      const info = createAuthInfo(config).info;
      const data = BufferFrom('010361626303313232', 'hex');

      usernamePasswordAuthetication(connection, data, info);

      assert(connection.getWriteCalled()[0].equals(BufferFrom('0101', 'hex')));
    });

    it('should accept the request with valid username/password', () => {
      const config = {
        auth: {
          forceAuth: true,
          usernamePassword: {
            abc: '123',
          },
        },
      };
      const connection = createMockConnection();
      const info = createAuthInfo(config).info;
      const data = BufferFrom('010361626303313233', 'hex');

      usernamePasswordAuthetication(connection, data, info);

      assert(connection.getWriteCalled()[0].equals(BufferFrom('0100', 'hex')));
    });
  });
});
