'use strict';

exports.__esModule = true;
exports.startServer = startServer;

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _net = require('net');

var _utils = require('./utils');

var _logger = require('./logger');

var _encryptor = require('./encryptor');

var _createUDPRelay = require('./createUDPRelay');

var _createUDPRelay2 = _interopRequireDefault(_createUDPRelay);

var _config = require('./config');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NAME = 'ss_server';
// import { INTERVAL_TIME } from './recordMemoryUsage';


var logger = void 0;

function createClientToDst(connection, data, password, method, onConnect, onDestroy, isLocalConnected) {
  var dstInfo = (0, _utils.getDstInfo)(data, true);

  var cipher = null;
  var tmp = void 0;
  var cipheredData = void 0;
  var preservedData = null;

  if (!dstInfo) {
    logger.warn(NAME + ' receive invalid msg. ' + 'local method/password doesn\'t accord with the server\'s?');
    return null;
  }

  var clientOptions = {
    port: dstInfo.dstPort.readUInt16BE(),
    host: dstInfo.atyp === 3 ? dstInfo.dstAddr.toString('ascii') : _ip2.default.toString(dstInfo.dstAddr)
  };

  if (dstInfo.totalLength < data.length) {
    preservedData = data.slice(dstInfo.totalLength);
  }

  var clientToDst = (0, _net.connect)(clientOptions, onConnect);

  clientToDst.on('data', function (clientData) {
    if (!cipher) {
      tmp = (0, _encryptor.createCipher)(password, method, clientData);
      cipher = tmp.cipher;
      cipheredData = tmp.data;
    } else {
      cipheredData = cipher.update(clientData);
    }

    if (isLocalConnected()) {
      (0, _utils.writeOrPause)(clientToDst, connection, cipheredData);
    } else {
      clientToDst.destroy();
    }
  });

  clientToDst.on('drain', function () {
    connection.resume();
  });

  clientToDst.on('end', function () {
    if (isLocalConnected()) {
      connection.end();
    }
  });

  clientToDst.on('error', function (e) {
    logger.warn('ssServer error happened when write to DST: ' + e.message);
    onDestroy();
  });

  clientToDst.on('close', function (e) {
    if (isLocalConnected()) {
      if (e) {
        connection.destroy();
      } else {
        connection.end();
      }
    }
  });

  return {
    clientToDst: clientToDst, preservedData: preservedData
  };
}

function handleConnection(config, connection) {
  var stage = 0;
  var clientToDst = null;
  var decipher = null;
  var tmp = void 0;
  var data = void 0;
  var localConnected = true;
  var dstConnected = false;
  var timer = null;

  connection.on('data', function (chunck) {
    try {
      if (!decipher) {
        tmp = (0, _encryptor.createDecipher)(config.password, config.method, chunck);
        decipher = tmp.decipher;
        data = tmp.data;
      } else {
        data = decipher.update(chunck);
      }
    } catch (e) {
      logger.warn(NAME + ' receive invalid data');
      return;
    }

    switch (stage) {
      case 0:
        // TODO: should pause? or preserve data?
        connection.pause();

        tmp = createClientToDst(connection, data, config.password, config.method, function () {
          dstConnected = true;
          connection.resume();
        }, function () {
          if (dstConnected) {
            dstConnected = false;
            clientToDst.destroy();
          }

          if (localConnected) {
            localConnected = false;
            connection.destroy();
          }
        }, function () {
          return localConnected;
        });

        if (!tmp) {
          connection.destroy();
          return;
        }

        clientToDst = tmp.clientToDst;

        if (tmp.preservedData) {
          (0, _utils.writeOrPause)(connection, clientToDst, tmp.preservedData);
        }

        stage = 1;
        break;
      case 1:
        (0, _utils.writeOrPause)(connection, clientToDst, data);
        break;
      default:
    }
  });

  connection.on('drain', function () {
    clientToDst.resume();
  });

  connection.on('end', function () {
    localConnected = false;

    if (dstConnected) {
      clientToDst.end();
    }
  });

  connection.on('error', function (e) {
    logger.warn('ssServer error happened in the connection with ssLocal : ' + e.message);
  });

  connection.on('close', function (e) {
    if (timer) {
      clearTimeout(timer);
    }

    localConnected = false;

    if (dstConnected) {
      if (e) {
        clientToDst.destroy();
      } else {
        clientToDst.end();
      }
    }
  });

  timer = setTimeout(function () {
    if (localConnected) {
      connection.destroy();
    }

    if (dstConnected) {
      clientToDst.destroy();
    }
  }, config.timeout * 1000);
}

function createServer(config) {
  var serverAddr = config.serverAddr,
      _config$udpActive = config.udpActive,
      udpActive = _config$udpActive === undefined ? true : _config$udpActive;

  var server = (0, _net.createServer)(handleConnection.bind(null, config)).listen(config.serverPort, serverAddr);

  var udpRelay = null;

  if (udpActive) {
    udpRelay = (0, _createUDPRelay2.default)(config, true, logger);
  }

  server.on('close', function () {
    logger.warn(NAME + ' server closed');
  });

  server.on('error', function (e) {
    logger.error(NAME + ' server error: ' + e.message);
  });

  logger.verbose(NAME + ' is listening on ' + config.serverAddr + ':' + config.serverPort);

  return {
    server: server, udpRelay: udpRelay
  };
}

// eslint-disable-next-line
function startServer(config) {
  var willLogToConsole = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var injectedLogger = arguments[2];

  logger = logger || injectedLogger || (0, _logger.createLogger)(config, _logger.LOG_NAMES.SERVER, willLogToConsole);

  return createServer(config);
}

if (module === require.main) {
  (0, _config.getConfig)(process.argv.slice(2), function (err, config) {
    if (err) {
      throw err;
    }

    var proxyOptions = config.proxyOptions;


    logger = (0, _logger.createLogger)(proxyOptions, _logger.LOG_NAMES.SERVER, true, true);
    startServer(proxyOptions, false);

    // TODO:
    // NOTE: DEV only
    // eslint-disable-next-line
    // if (config._recordMemoryUsage) {
    //   setInterval(() => {
    //     process.send(process.memoryUsage());
    //   }, INTERVAL_TIME);
    // }
  });

  process.on('uncaughtException', function (err) {
    logger.error(NAME + ' uncaughtException: ' + err.stack, (0, _utils.createSafeAfterHandler)(logger, function () {
      process.exit(1);
    }));
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zc1NlcnZlci5qcyJdLCJuYW1lcyI6WyJzdGFydFNlcnZlciIsIk5BTUUiLCJsb2dnZXIiLCJjcmVhdGVDbGllbnRUb0RzdCIsImNvbm5lY3Rpb24iLCJkYXRhIiwicGFzc3dvcmQiLCJtZXRob2QiLCJvbkNvbm5lY3QiLCJvbkRlc3Ryb3kiLCJpc0xvY2FsQ29ubmVjdGVkIiwiZHN0SW5mbyIsImNpcGhlciIsInRtcCIsImNpcGhlcmVkRGF0YSIsInByZXNlcnZlZERhdGEiLCJ3YXJuIiwiY2xpZW50T3B0aW9ucyIsInBvcnQiLCJkc3RQb3J0IiwicmVhZFVJbnQxNkJFIiwiaG9zdCIsImF0eXAiLCJkc3RBZGRyIiwidG9TdHJpbmciLCJ0b3RhbExlbmd0aCIsImxlbmd0aCIsInNsaWNlIiwiY2xpZW50VG9Ec3QiLCJvbiIsImNsaWVudERhdGEiLCJ1cGRhdGUiLCJkZXN0cm95IiwicmVzdW1lIiwiZW5kIiwiZSIsIm1lc3NhZ2UiLCJoYW5kbGVDb25uZWN0aW9uIiwiY29uZmlnIiwic3RhZ2UiLCJkZWNpcGhlciIsImxvY2FsQ29ubmVjdGVkIiwiZHN0Q29ubmVjdGVkIiwidGltZXIiLCJjaHVuY2siLCJwYXVzZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJ0aW1lb3V0IiwiY3JlYXRlU2VydmVyIiwic2VydmVyQWRkciIsInVkcEFjdGl2ZSIsInNlcnZlciIsImJpbmQiLCJsaXN0ZW4iLCJzZXJ2ZXJQb3J0IiwidWRwUmVsYXkiLCJlcnJvciIsInZlcmJvc2UiLCJ3aWxsTG9nVG9Db25zb2xlIiwiaW5qZWN0ZWRMb2dnZXIiLCJTRVJWRVIiLCJtb2R1bGUiLCJyZXF1aXJlIiwibWFpbiIsInByb2Nlc3MiLCJhcmd2IiwiZXJyIiwicHJveHlPcHRpb25zIiwic3RhY2siLCJleGl0Il0sIm1hcHBpbmdzIjoiOzs7UUFvT2dCQSxXLEdBQUFBLFc7O0FBcE9oQjs7OztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7O0FBRUE7Ozs7QUFFQSxJQUFNQyxPQUFPLFdBQWI7QUFIQTs7O0FBS0EsSUFBSUMsZUFBSjs7QUFFQSxTQUFTQyxpQkFBVCxDQUNFQyxVQURGLEVBQ2NDLElBRGQsRUFFRUMsUUFGRixFQUVZQyxNQUZaLEVBRW9CQyxTQUZwQixFQUUrQkMsU0FGL0IsRUFFMENDLGdCQUYxQyxFQUdFO0FBQ0EsTUFBTUMsVUFBVSx1QkFBV04sSUFBWCxFQUFpQixJQUFqQixDQUFoQjs7QUFFQSxNQUFJTyxTQUFTLElBQWI7QUFDQSxNQUFJQyxZQUFKO0FBQ0EsTUFBSUMscUJBQUo7QUFDQSxNQUFJQyxnQkFBZ0IsSUFBcEI7O0FBRUEsTUFBSSxDQUFDSixPQUFMLEVBQWM7QUFDWlQsV0FBT2MsSUFBUCxDQUFlZixJQUFILDhCQUNSLDJEQURKO0FBRUEsV0FBTyxJQUFQO0FBQ0Q7O0FBRUQsTUFBTWdCLGdCQUFnQjtBQUNwQkMsVUFBTVAsUUFBUVEsT0FBUixDQUFnQkMsWUFBaEIsRUFEYztBQUVwQkMsVUFBT1YsUUFBUVcsSUFBUixLQUFpQixDQUFqQixHQUNIWCxRQUFRWSxPQUFSLENBQWdCQyxRQUFoQixDQUF5QixPQUF6QixDQURHLEdBQ2lDLGFBQUdBLFFBQUgsQ0FBWWIsUUFBUVksT0FBcEI7QUFIcEIsR0FBdEI7O0FBTUEsTUFBSVosUUFBUWMsV0FBUixHQUFzQnBCLEtBQUtxQixNQUEvQixFQUF1QztBQUNyQ1gsb0JBQWdCVixLQUFLc0IsS0FBTCxDQUFXaEIsUUFBUWMsV0FBbkIsQ0FBaEI7QUFDRDs7QUFFRCxNQUFNRyxjQUFjLGtCQUFRWCxhQUFSLEVBQXVCVCxTQUF2QixDQUFwQjs7QUFFQW9CLGNBQVlDLEVBQVosQ0FBZSxNQUFmLEVBQXVCLFVBQUNDLFVBQUQsRUFBZ0I7QUFDckMsUUFBSSxDQUFDbEIsTUFBTCxFQUFhO0FBQ1hDLFlBQU0sNkJBQWFQLFFBQWIsRUFBdUJDLE1BQXZCLEVBQStCdUIsVUFBL0IsQ0FBTjtBQUNBbEIsZUFBU0MsSUFBSUQsTUFBYjtBQUNBRSxxQkFBZUQsSUFBSVIsSUFBbkI7QUFDRCxLQUpELE1BSU87QUFDTFMscUJBQWVGLE9BQU9tQixNQUFQLENBQWNELFVBQWQsQ0FBZjtBQUNEOztBQUVELFFBQUlwQixrQkFBSixFQUF3QjtBQUN0QiwrQkFBYWtCLFdBQWIsRUFBMEJ4QixVQUExQixFQUFzQ1UsWUFBdEM7QUFDRCxLQUZELE1BRU87QUFDTGMsa0JBQVlJLE9BQVo7QUFDRDtBQUNGLEdBZEQ7O0FBZ0JBSixjQUFZQyxFQUFaLENBQWUsT0FBZixFQUF3QixZQUFNO0FBQzVCekIsZUFBVzZCLE1BQVg7QUFDRCxHQUZEOztBQUlBTCxjQUFZQyxFQUFaLENBQWUsS0FBZixFQUFzQixZQUFNO0FBQzFCLFFBQUluQixrQkFBSixFQUF3QjtBQUN0Qk4saUJBQVc4QixHQUFYO0FBQ0Q7QUFDRixHQUpEOztBQU1BTixjQUFZQyxFQUFaLENBQWUsT0FBZixFQUF3QixVQUFDTSxDQUFELEVBQU87QUFDN0JqQyxXQUFPYyxJQUFQLGlEQUEwRG1CLEVBQUVDLE9BQTVEO0FBQ0EzQjtBQUNELEdBSEQ7O0FBS0FtQixjQUFZQyxFQUFaLENBQWUsT0FBZixFQUF3QixVQUFDTSxDQUFELEVBQU87QUFDN0IsUUFBSXpCLGtCQUFKLEVBQXdCO0FBQ3RCLFVBQUl5QixDQUFKLEVBQU87QUFDTC9CLG1CQUFXNEIsT0FBWDtBQUNELE9BRkQsTUFFTztBQUNMNUIsbUJBQVc4QixHQUFYO0FBQ0Q7QUFDRjtBQUNGLEdBUkQ7O0FBVUEsU0FBTztBQUNMTiw0QkFESyxFQUNRYjtBQURSLEdBQVA7QUFHRDs7QUFFRCxTQUFTc0IsZ0JBQVQsQ0FBMEJDLE1BQTFCLEVBQWtDbEMsVUFBbEMsRUFBOEM7QUFDNUMsTUFBSW1DLFFBQVEsQ0FBWjtBQUNBLE1BQUlYLGNBQWMsSUFBbEI7QUFDQSxNQUFJWSxXQUFXLElBQWY7QUFDQSxNQUFJM0IsWUFBSjtBQUNBLE1BQUlSLGFBQUo7QUFDQSxNQUFJb0MsaUJBQWlCLElBQXJCO0FBQ0EsTUFBSUMsZUFBZSxLQUFuQjtBQUNBLE1BQUlDLFFBQVEsSUFBWjs7QUFFQXZDLGFBQVd5QixFQUFYLENBQWMsTUFBZCxFQUFzQixVQUFDZSxNQUFELEVBQVk7QUFDaEMsUUFBSTtBQUNGLFVBQUksQ0FBQ0osUUFBTCxFQUFlO0FBQ2IzQixjQUFNLCtCQUFleUIsT0FBT2hDLFFBQXRCLEVBQWdDZ0MsT0FBTy9CLE1BQXZDLEVBQStDcUMsTUFBL0MsQ0FBTjtBQUNBSixtQkFBVzNCLElBQUkyQixRQUFmO0FBQ0FuQyxlQUFPUSxJQUFJUixJQUFYO0FBQ0QsT0FKRCxNQUlPO0FBQ0xBLGVBQU9tQyxTQUFTVCxNQUFULENBQWdCYSxNQUFoQixDQUFQO0FBQ0Q7QUFDRixLQVJELENBUUUsT0FBT1QsQ0FBUCxFQUFVO0FBQ1ZqQyxhQUFPYyxJQUFQLENBQWVmLElBQWY7QUFDQTtBQUNEOztBQUVELFlBQVFzQyxLQUFSO0FBQ0UsV0FBSyxDQUFMO0FBQ0U7QUFDQW5DLG1CQUFXeUMsS0FBWDs7QUFFQWhDLGNBQU1WLGtCQUNKQyxVQURJLEVBQ1FDLElBRFIsRUFFSmlDLE9BQU9oQyxRQUZILEVBRWFnQyxPQUFPL0IsTUFGcEIsRUFHSixZQUFNO0FBQ0ptQyx5QkFBZSxJQUFmO0FBQ0F0QyxxQkFBVzZCLE1BQVg7QUFDRCxTQU5HLEVBT0osWUFBTTtBQUNKLGNBQUlTLFlBQUosRUFBa0I7QUFDaEJBLDJCQUFlLEtBQWY7QUFDQWQsd0JBQVlJLE9BQVo7QUFDRDs7QUFFRCxjQUFJUyxjQUFKLEVBQW9CO0FBQ2xCQSw2QkFBaUIsS0FBakI7QUFDQXJDLHVCQUFXNEIsT0FBWDtBQUNEO0FBQ0YsU0FqQkcsRUFrQko7QUFBQSxpQkFBTVMsY0FBTjtBQUFBLFNBbEJJLENBQU47O0FBcUJBLFlBQUksQ0FBQzVCLEdBQUwsRUFBVTtBQUNSVCxxQkFBVzRCLE9BQVg7QUFDQTtBQUNEOztBQUVESixzQkFBY2YsSUFBSWUsV0FBbEI7O0FBRUEsWUFBSWYsSUFBSUUsYUFBUixFQUF1QjtBQUNyQixtQ0FBYVgsVUFBYixFQUF5QndCLFdBQXpCLEVBQXNDZixJQUFJRSxhQUExQztBQUNEOztBQUVEd0IsZ0JBQVEsQ0FBUjtBQUNBO0FBQ0YsV0FBSyxDQUFMO0FBQ0UsaUNBQWFuQyxVQUFiLEVBQXlCd0IsV0FBekIsRUFBc0N2QixJQUF0QztBQUNBO0FBQ0Y7QUExQ0Y7QUE0Q0QsR0ExREQ7O0FBNERBRCxhQUFXeUIsRUFBWCxDQUFjLE9BQWQsRUFBdUIsWUFBTTtBQUMzQkQsZ0JBQVlLLE1BQVo7QUFDRCxHQUZEOztBQUlBN0IsYUFBV3lCLEVBQVgsQ0FBYyxLQUFkLEVBQXFCLFlBQU07QUFDekJZLHFCQUFpQixLQUFqQjs7QUFFQSxRQUFJQyxZQUFKLEVBQWtCO0FBQ2hCZCxrQkFBWU0sR0FBWjtBQUNEO0FBQ0YsR0FORDs7QUFRQTlCLGFBQVd5QixFQUFYLENBQWMsT0FBZCxFQUF1QixVQUFDTSxDQUFELEVBQU87QUFDNUJqQyxXQUFPYyxJQUFQLCtEQUF3RW1CLEVBQUVDLE9BQTFFO0FBQ0QsR0FGRDs7QUFJQWhDLGFBQVd5QixFQUFYLENBQWMsT0FBZCxFQUF1QixVQUFDTSxDQUFELEVBQU87QUFDNUIsUUFBSVEsS0FBSixFQUFXO0FBQ1RHLG1CQUFhSCxLQUFiO0FBQ0Q7O0FBRURGLHFCQUFpQixLQUFqQjs7QUFFQSxRQUFJQyxZQUFKLEVBQWtCO0FBQ2hCLFVBQUlQLENBQUosRUFBTztBQUNMUCxvQkFBWUksT0FBWjtBQUNELE9BRkQsTUFFTztBQUNMSixvQkFBWU0sR0FBWjtBQUNEO0FBQ0Y7QUFDRixHQWREOztBQWdCQVMsVUFBUUksV0FBVyxZQUFNO0FBQ3ZCLFFBQUlOLGNBQUosRUFBb0I7QUFDbEJyQyxpQkFBVzRCLE9BQVg7QUFDRDs7QUFFRCxRQUFJVSxZQUFKLEVBQWtCO0FBQ2hCZCxrQkFBWUksT0FBWjtBQUNEO0FBQ0YsR0FSTyxFQVFMTSxPQUFPVSxPQUFQLEdBQWlCLElBUlosQ0FBUjtBQVNEOztBQUVELFNBQVNDLFlBQVQsQ0FBc0JYLE1BQXRCLEVBQThCO0FBQUEsTUFDcEJZLFVBRG9CLEdBQ2FaLE1BRGIsQ0FDcEJZLFVBRG9CO0FBQUEsMEJBQ2FaLE1BRGIsQ0FDUmEsU0FEUTtBQUFBLE1BQ1JBLFNBRFEscUNBQ0ksSUFESjs7QUFFNUIsTUFBTUMsU0FBUyx1QkFBY2YsaUJBQWlCZ0IsSUFBakIsQ0FBc0IsSUFBdEIsRUFBNEJmLE1BQTVCLENBQWQsRUFDWmdCLE1BRFksQ0FDTGhCLE9BQU9pQixVQURGLEVBQ2NMLFVBRGQsQ0FBZjs7QUFHQSxNQUFJTSxXQUFXLElBQWY7O0FBRUEsTUFBSUwsU0FBSixFQUFlO0FBQ2JLLGVBQVcsOEJBQWVsQixNQUFmLEVBQXVCLElBQXZCLEVBQTZCcEMsTUFBN0IsQ0FBWDtBQUNEOztBQUVEa0QsU0FBT3ZCLEVBQVAsQ0FBVSxPQUFWLEVBQW1CLFlBQU07QUFDdkIzQixXQUFPYyxJQUFQLENBQWVmLElBQWY7QUFDRCxHQUZEOztBQUlBbUQsU0FBT3ZCLEVBQVAsQ0FBVSxPQUFWLEVBQW1CLFVBQUNNLENBQUQsRUFBTztBQUN4QmpDLFdBQU91RCxLQUFQLENBQWdCeEQsSUFBaEIsdUJBQXNDa0MsRUFBRUMsT0FBeEM7QUFDRCxHQUZEOztBQUlBbEMsU0FBT3dELE9BQVAsQ0FBa0J6RCxJQUFsQix5QkFBMENxQyxPQUFPWSxVQUFqRCxTQUErRFosT0FBT2lCLFVBQXRFOztBQUVBLFNBQU87QUFDTEgsa0JBREssRUFDR0k7QUFESCxHQUFQO0FBR0Q7O0FBRUQ7QUFDTyxTQUFTeEQsV0FBVCxDQUFxQnNDLE1BQXJCLEVBQXVFO0FBQUEsTUFBMUNxQixnQkFBMEMsdUVBQXZCLEtBQXVCO0FBQUEsTUFBaEJDLGNBQWdCOztBQUM1RTFELFdBQVNBLFVBQVUwRCxjQUFWLElBQ0osMEJBQWF0QixNQUFiLEVBQXFCLGtCQUFVdUIsTUFBL0IsRUFBdUNGLGdCQUF2QyxDQURMOztBQUdBLFNBQU9WLGFBQWFYLE1BQWIsQ0FBUDtBQUNEOztBQUVELElBQUl3QixXQUFXQyxRQUFRQyxJQUF2QixFQUE2QjtBQUMzQix5QkFBVUMsUUFBUUMsSUFBUixDQUFhdkMsS0FBYixDQUFtQixDQUFuQixDQUFWLEVBQWlDLFVBQUN3QyxHQUFELEVBQU03QixNQUFOLEVBQWlCO0FBQ2hELFFBQUk2QixHQUFKLEVBQVM7QUFDUCxZQUFNQSxHQUFOO0FBQ0Q7O0FBSCtDLFFBS3hDQyxZQUx3QyxHQUt2QjlCLE1BTHVCLENBS3hDOEIsWUFMd0M7OztBQU9oRGxFLGFBQVMsMEJBQ1BrRSxZQURPLEVBRVAsa0JBQVVQLE1BRkgsRUFHUCxJQUhPLEVBSVAsSUFKTyxDQUFUO0FBTUE3RCxnQkFBWW9FLFlBQVosRUFBMEIsS0FBMUI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNELEdBdkJEOztBQXlCQUgsVUFBUXBDLEVBQVIsQ0FBVyxtQkFBWCxFQUFnQyxVQUFDc0MsR0FBRCxFQUFTO0FBQ3ZDakUsV0FBT3VELEtBQVAsQ0FBZ0J4RCxJQUFoQiw0QkFBMkNrRSxJQUFJRSxLQUEvQyxFQUF3RCxtQ0FBdUJuRSxNQUF2QixFQUErQixZQUFNO0FBQzNGK0QsY0FBUUssSUFBUixDQUFhLENBQWI7QUFDRCxLQUZ1RCxDQUF4RDtBQUdELEdBSkQ7QUFLRCIsImZpbGUiOiJzc1NlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpcCBmcm9tICdpcCc7XG5pbXBvcnQgeyBjcmVhdGVTZXJ2ZXIgYXMgX2NyZWF0ZVNlcnZlciwgY29ubmVjdCB9IGZyb20gJ25ldCc7XG5pbXBvcnQgeyBnZXREc3RJbmZvLCB3cml0ZU9yUGF1c2UsIGNyZWF0ZVNhZmVBZnRlckhhbmRsZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciwgTE9HX05BTUVTIH0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHsgY3JlYXRlQ2lwaGVyLCBjcmVhdGVEZWNpcGhlciB9IGZyb20gJy4vZW5jcnlwdG9yJztcbmltcG9ydCBjcmVhdGVVRFBSZWxheSBmcm9tICcuL2NyZWF0ZVVEUFJlbGF5Jztcbi8vIGltcG9ydCB7IElOVEVSVkFMX1RJTUUgfSBmcm9tICcuL3JlY29yZE1lbW9yeVVzYWdlJztcbmltcG9ydCB7IGdldENvbmZpZyB9IGZyb20gJy4vY29uZmlnJztcblxuY29uc3QgTkFNRSA9ICdzc19zZXJ2ZXInO1xuXG5sZXQgbG9nZ2VyO1xuXG5mdW5jdGlvbiBjcmVhdGVDbGllbnRUb0RzdChcbiAgY29ubmVjdGlvbiwgZGF0YSxcbiAgcGFzc3dvcmQsIG1ldGhvZCwgb25Db25uZWN0LCBvbkRlc3Ryb3ksIGlzTG9jYWxDb25uZWN0ZWRcbikge1xuICBjb25zdCBkc3RJbmZvID0gZ2V0RHN0SW5mbyhkYXRhLCB0cnVlKTtcblxuICBsZXQgY2lwaGVyID0gbnVsbDtcbiAgbGV0IHRtcDtcbiAgbGV0IGNpcGhlcmVkRGF0YTtcbiAgbGV0IHByZXNlcnZlZERhdGEgPSBudWxsO1xuXG4gIGlmICghZHN0SW5mbykge1xuICAgIGxvZ2dlci53YXJuKGAke05BTUV9IHJlY2VpdmUgaW52YWxpZCBtc2cuIGBcbiAgICAgICsgJ2xvY2FsIG1ldGhvZC9wYXNzd29yZCBkb2VzblxcJ3QgYWNjb3JkIHdpdGggdGhlIHNlcnZlclxcJ3M/Jyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjbGllbnRPcHRpb25zID0ge1xuICAgIHBvcnQ6IGRzdEluZm8uZHN0UG9ydC5yZWFkVUludDE2QkUoKSxcbiAgICBob3N0OiAoZHN0SW5mby5hdHlwID09PSAzXG4gICAgICA/IGRzdEluZm8uZHN0QWRkci50b1N0cmluZygnYXNjaWknKSA6IGlwLnRvU3RyaW5nKGRzdEluZm8uZHN0QWRkcikpLFxuICB9O1xuXG4gIGlmIChkc3RJbmZvLnRvdGFsTGVuZ3RoIDwgZGF0YS5sZW5ndGgpIHtcbiAgICBwcmVzZXJ2ZWREYXRhID0gZGF0YS5zbGljZShkc3RJbmZvLnRvdGFsTGVuZ3RoKTtcbiAgfVxuXG4gIGNvbnN0IGNsaWVudFRvRHN0ID0gY29ubmVjdChjbGllbnRPcHRpb25zLCBvbkNvbm5lY3QpO1xuXG4gIGNsaWVudFRvRHN0Lm9uKCdkYXRhJywgKGNsaWVudERhdGEpID0+IHtcbiAgICBpZiAoIWNpcGhlcikge1xuICAgICAgdG1wID0gY3JlYXRlQ2lwaGVyKHBhc3N3b3JkLCBtZXRob2QsIGNsaWVudERhdGEpO1xuICAgICAgY2lwaGVyID0gdG1wLmNpcGhlcjtcbiAgICAgIGNpcGhlcmVkRGF0YSA9IHRtcC5kYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaXBoZXJlZERhdGEgPSBjaXBoZXIudXBkYXRlKGNsaWVudERhdGEpO1xuICAgIH1cblxuICAgIGlmIChpc0xvY2FsQ29ubmVjdGVkKCkpIHtcbiAgICAgIHdyaXRlT3JQYXVzZShjbGllbnRUb0RzdCwgY29ubmVjdGlvbiwgY2lwaGVyZWREYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2xpZW50VG9Ec3QuZGVzdHJveSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgY2xpZW50VG9Ec3Qub24oJ2RyYWluJywgKCkgPT4ge1xuICAgIGNvbm5lY3Rpb24ucmVzdW1lKCk7XG4gIH0pO1xuXG4gIGNsaWVudFRvRHN0Lm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgaWYgKGlzTG9jYWxDb25uZWN0ZWQoKSkge1xuICAgICAgY29ubmVjdGlvbi5lbmQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNsaWVudFRvRHN0Lm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgbG9nZ2VyLndhcm4oYHNzU2VydmVyIGVycm9yIGhhcHBlbmVkIHdoZW4gd3JpdGUgdG8gRFNUOiAke2UubWVzc2FnZX1gKTtcbiAgICBvbkRlc3Ryb3koKTtcbiAgfSk7XG5cbiAgY2xpZW50VG9Ec3Qub24oJ2Nsb3NlJywgKGUpID0+IHtcbiAgICBpZiAoaXNMb2NhbENvbm5lY3RlZCgpKSB7XG4gICAgICBpZiAoZSkge1xuICAgICAgICBjb25uZWN0aW9uLmRlc3Ryb3koKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIGNsaWVudFRvRHN0LCBwcmVzZXJ2ZWREYXRhLFxuICB9O1xufVxuXG5mdW5jdGlvbiBoYW5kbGVDb25uZWN0aW9uKGNvbmZpZywgY29ubmVjdGlvbikge1xuICBsZXQgc3RhZ2UgPSAwO1xuICBsZXQgY2xpZW50VG9Ec3QgPSBudWxsO1xuICBsZXQgZGVjaXBoZXIgPSBudWxsO1xuICBsZXQgdG1wO1xuICBsZXQgZGF0YTtcbiAgbGV0IGxvY2FsQ29ubmVjdGVkID0gdHJ1ZTtcbiAgbGV0IGRzdENvbm5lY3RlZCA9IGZhbHNlO1xuICBsZXQgdGltZXIgPSBudWxsO1xuXG4gIGNvbm5lY3Rpb24ub24oJ2RhdGEnLCAoY2h1bmNrKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghZGVjaXBoZXIpIHtcbiAgICAgICAgdG1wID0gY3JlYXRlRGVjaXBoZXIoY29uZmlnLnBhc3N3b3JkLCBjb25maWcubWV0aG9kLCBjaHVuY2spO1xuICAgICAgICBkZWNpcGhlciA9IHRtcC5kZWNpcGhlcjtcbiAgICAgICAgZGF0YSA9IHRtcC5kYXRhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGF0YSA9IGRlY2lwaGVyLnVwZGF0ZShjaHVuY2spO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci53YXJuKGAke05BTUV9IHJlY2VpdmUgaW52YWxpZCBkYXRhYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3dpdGNoIChzdGFnZSkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICAvLyBUT0RPOiBzaG91bGQgcGF1c2U/IG9yIHByZXNlcnZlIGRhdGE/XG4gICAgICAgIGNvbm5lY3Rpb24ucGF1c2UoKTtcblxuICAgICAgICB0bXAgPSBjcmVhdGVDbGllbnRUb0RzdChcbiAgICAgICAgICBjb25uZWN0aW9uLCBkYXRhLFxuICAgICAgICAgIGNvbmZpZy5wYXNzd29yZCwgY29uZmlnLm1ldGhvZCxcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBkc3RDb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5yZXN1bWUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChkc3RDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgZHN0Q29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNsaWVudFRvRHN0LmRlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxvY2FsQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgIGxvY2FsQ29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNvbm5lY3Rpb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgKCkgPT4gbG9jYWxDb25uZWN0ZWRcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoIXRtcCkge1xuICAgICAgICAgIGNvbm5lY3Rpb24uZGVzdHJveSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsaWVudFRvRHN0ID0gdG1wLmNsaWVudFRvRHN0O1xuXG4gICAgICAgIGlmICh0bXAucHJlc2VydmVkRGF0YSkge1xuICAgICAgICAgIHdyaXRlT3JQYXVzZShjb25uZWN0aW9uLCBjbGllbnRUb0RzdCwgdG1wLnByZXNlcnZlZERhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhZ2UgPSAxO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgd3JpdGVPclBhdXNlKGNvbm5lY3Rpb24sIGNsaWVudFRvRHN0LCBkYXRhKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgIH1cbiAgfSk7XG5cbiAgY29ubmVjdGlvbi5vbignZHJhaW4nLCAoKSA9PiB7XG4gICAgY2xpZW50VG9Ec3QucmVzdW1lKCk7XG4gIH0pO1xuXG4gIGNvbm5lY3Rpb24ub24oJ2VuZCcsICgpID0+IHtcbiAgICBsb2NhbENvbm5lY3RlZCA9IGZhbHNlO1xuXG4gICAgaWYgKGRzdENvbm5lY3RlZCkge1xuICAgICAgY2xpZW50VG9Ec3QuZW5kKCk7XG4gICAgfVxuICB9KTtcblxuICBjb25uZWN0aW9uLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgbG9nZ2VyLndhcm4oYHNzU2VydmVyIGVycm9yIGhhcHBlbmVkIGluIHRoZSBjb25uZWN0aW9uIHdpdGggc3NMb2NhbCA6ICR7ZS5tZXNzYWdlfWApO1xuICB9KTtcblxuICBjb25uZWN0aW9uLm9uKCdjbG9zZScsIChlKSA9PiB7XG4gICAgaWYgKHRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIH1cblxuICAgIGxvY2FsQ29ubmVjdGVkID0gZmFsc2U7XG5cbiAgICBpZiAoZHN0Q29ubmVjdGVkKSB7XG4gICAgICBpZiAoZSkge1xuICAgICAgICBjbGllbnRUb0RzdC5kZXN0cm95KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGllbnRUb0RzdC5lbmQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgaWYgKGxvY2FsQ29ubmVjdGVkKSB7XG4gICAgICBjb25uZWN0aW9uLmRlc3Ryb3koKTtcbiAgICB9XG5cbiAgICBpZiAoZHN0Q29ubmVjdGVkKSB7XG4gICAgICBjbGllbnRUb0RzdC5kZXN0cm95KCk7XG4gICAgfVxuICB9LCBjb25maWcudGltZW91dCAqIDEwMDApO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVTZXJ2ZXIoY29uZmlnKSB7XG4gIGNvbnN0IHsgc2VydmVyQWRkciwgdWRwQWN0aXZlID0gdHJ1ZSB9ID0gY29uZmlnO1xuICBjb25zdCBzZXJ2ZXIgPSBfY3JlYXRlU2VydmVyKGhhbmRsZUNvbm5lY3Rpb24uYmluZChudWxsLCBjb25maWcpKVxuICAgIC5saXN0ZW4oY29uZmlnLnNlcnZlclBvcnQsIHNlcnZlckFkZHIpO1xuXG4gIGxldCB1ZHBSZWxheSA9IG51bGw7XG5cbiAgaWYgKHVkcEFjdGl2ZSkge1xuICAgIHVkcFJlbGF5ID0gY3JlYXRlVURQUmVsYXkoY29uZmlnLCB0cnVlLCBsb2dnZXIpO1xuICB9XG5cbiAgc2VydmVyLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICBsb2dnZXIud2FybihgJHtOQU1FfSBzZXJ2ZXIgY2xvc2VkYCk7XG4gIH0pO1xuXG4gIHNlcnZlci5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgIGxvZ2dlci5lcnJvcihgJHtOQU1FfSBzZXJ2ZXIgZXJyb3I6ICR7ZS5tZXNzYWdlfWApO1xuICB9KTtcblxuICBsb2dnZXIudmVyYm9zZShgJHtOQU1FfSBpcyBsaXN0ZW5pbmcgb24gJHtjb25maWcuc2VydmVyQWRkcn06JHtjb25maWcuc2VydmVyUG9ydH1gKTtcblxuICByZXR1cm4ge1xuICAgIHNlcnZlciwgdWRwUmVsYXksXG4gIH07XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0U2VydmVyKGNvbmZpZywgd2lsbExvZ1RvQ29uc29sZSA9IGZhbHNlLCBpbmplY3RlZExvZ2dlcikge1xuICBsb2dnZXIgPSBsb2dnZXIgfHwgaW5qZWN0ZWRMb2dnZXJcbiAgICB8fCBjcmVhdGVMb2dnZXIoY29uZmlnLCBMT0dfTkFNRVMuU0VSVkVSLCB3aWxsTG9nVG9Db25zb2xlKTtcblxuICByZXR1cm4gY3JlYXRlU2VydmVyKGNvbmZpZyk7XG59XG5cbmlmIChtb2R1bGUgPT09IHJlcXVpcmUubWFpbikge1xuICBnZXRDb25maWcocHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCAoZXJyLCBjb25maWcpID0+IHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgY29uc3QgeyBwcm94eU9wdGlvbnMgfSA9IGNvbmZpZztcblxuICAgIGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcihcbiAgICAgIHByb3h5T3B0aW9ucyxcbiAgICAgIExPR19OQU1FUy5TRVJWRVIsXG4gICAgICB0cnVlLFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICAgIHN0YXJ0U2VydmVyKHByb3h5T3B0aW9ucywgZmFsc2UpO1xuXG4gICAgLy8gVE9ETzpcbiAgICAvLyBOT1RFOiBERVYgb25seVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICAgIC8vIGlmIChjb25maWcuX3JlY29yZE1lbW9yeVVzYWdlKSB7XG4gICAgLy8gICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgLy8gICAgIHByb2Nlc3Muc2VuZChwcm9jZXNzLm1lbW9yeVVzYWdlKCkpO1xuICAgIC8vICAgfSwgSU5URVJWQUxfVElNRSk7XG4gICAgLy8gfVxuICB9KTtcblxuICBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIChlcnIpID0+IHtcbiAgICBsb2dnZXIuZXJyb3IoYCR7TkFNRX0gdW5jYXVnaHRFeGNlcHRpb246ICR7ZXJyLnN0YWNrfWAsIGNyZWF0ZVNhZmVBZnRlckhhbmRsZXIobG9nZ2VyLCAoKSA9PiB7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfSkpO1xuICB9KTtcbn1cbiJdfQ==