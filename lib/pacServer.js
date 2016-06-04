'use strict';

exports.__esModule = true;
exports.createPACServer = createPACServer;

var _http = require('http');

var _gfwlistUtils = require('./gfwlistUtils');

var NAME = 'pac_server';

// TODO: async this
function createPACServer(config, logger) {
  var pacFileContent = (0, _gfwlistUtils.getPACFileContent)(config);

  var server = (0, _http.createServer)(function (req, res) {
    res.write(pacFileContent);
    res.end();
  });

  server.listen(config.pacServerPort);

  if (logger) {
    logger.verbose(NAME + ' is listening on ' + config.localAddr + ':' + config.pacServerPort);
  }

  return server;
}