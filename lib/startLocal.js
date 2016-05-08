'use strict';

var _ssLocal = require('./ssLocal');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

process.on('message', function (config) {
  var level = config.level;

  if (level) {
    (0, _logger.changeLevel)(_logger2.default, level);
  }

  (0, _ssLocal.startServer)(config);
});