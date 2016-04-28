const filterObj = require('../lib/filter');
const assert = require('assert');

const setDenyList = filterObj.setDenyList;
const filter = filterObj.filter;

describe('filter', () => {
  setDenyList([
    /google/,
  ]);

  it('should let "example.com" pass', () => {
    assert(filter({
      atyp: 0x03,
      dstAddr: new Buffer('example.com', 'ascii'),
      dstPort: new Buffer([0x00, 0x50]),
    }));
  });

  it('should deny "www.google.com"', () => {
    assert(!filter({
      atyp: 0x03,
      dstAddr: new Buffer('www.google.com', 'ascii'),
      dstPort: new Buffer([0x00, 0x50]),
    }));
  });
});
