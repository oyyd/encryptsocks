const fs = require('fs');

fs.writeFileSync('./res.txt', JSON.stringify(process.argv.slice(2)));
