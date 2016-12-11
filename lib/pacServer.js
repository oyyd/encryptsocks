'use strict';

exports.__esModule = true;
exports.createPACServer = createPACServer;

var _http = require('http');

var _gfwlistUtils = require('./gfwlistUtils');

var NAME = 'pac_server';

// TODO: async this
// eslint-disable-next-line
function createPACServer(config, logger) {
  var pacFileContent = (0, _gfwlistUtils.getPACFileContent)(config);
  var HOST = config.localAddr + ':' + config.pacServerPort;

  var server = (0, _http.createServer)(function (req, res) {
    res.write(pacFileContent);
    res.end();
  });

  server.on('error', function (err) {
    logger.error(NAME + ' got error: ' + err.stack);
  });

  server.listen(config.pacServerPort);

  if (logger) {
    logger.verbose(NAME + ' is listening on ' + HOST);
  }

  return server;
}