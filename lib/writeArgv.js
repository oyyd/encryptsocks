'use strict';

var _fs = require('fs');

(0, _fs.writeFileSync)('./res.txt', JSON.stringify(process.argv.slice(2)));