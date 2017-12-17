'use strict';

exports.__esModule = true;
exports.TMP_PATH = undefined;
exports.getFileName = getFileName;
exports.getPid = getPid;
exports.writePidFile = writePidFile;
exports.deletePidFile = deletePidFile;

var _fs = require('fs');

var _path = require('path');

var _utils = require('./utils');

var TMP_PATH = exports.TMP_PATH = (0, _path.join)(__dirname, '../tmp');

function getFileName(type) {
  switch (type) {
    case 'local':
      return (0, _path.join)(TMP_PATH, 'local.pid');
    case 'server':
      return (0, _path.join)(TMP_PATH, 'server.pid');
    default:
      throw new Error('invalid \'type\' of filename ' + type);
  }
}

function getPid(type) {
  var fileName = getFileName(type);

  (0, _utils.mkdirIfNotExistSync)(TMP_PATH);

  try {
    (0, _fs.accessSync)(fileName);
  } catch (e) {
    return null;
  }

  return (0, _fs.readFileSync)(fileName).toString('utf8');
}

function writePidFile(type, pid) {
  (0, _utils.mkdirIfNotExistSync)(TMP_PATH);

  (0, _fs.writeFileSync)(getFileName(type), pid);
}

function deletePidFile(type) {
  (0, _utils.mkdirIfNotExistSync)(TMP_PATH);

  try {
    (0, _fs.unlinkSync)(getFileName(type));
  } catch (err) {
    // alreay unlinked
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9waWQuanMiXSwibmFtZXMiOlsiZ2V0RmlsZU5hbWUiLCJnZXRQaWQiLCJ3cml0ZVBpZEZpbGUiLCJkZWxldGVQaWRGaWxlIiwiVE1QX1BBVEgiLCJfX2Rpcm5hbWUiLCJ0eXBlIiwiRXJyb3IiLCJmaWxlTmFtZSIsImUiLCJ0b1N0cmluZyIsInBpZCIsImVyciJdLCJtYXBwaW5ncyI6Ijs7OztRQU1nQkEsVyxHQUFBQSxXO1FBV0FDLE0sR0FBQUEsTTtRQWNBQyxZLEdBQUFBLFk7UUFNQUMsYSxHQUFBQSxhOztBQXJDaEI7O0FBQ0E7O0FBQ0E7O0FBRU8sSUFBTUMsOEJBQVcsZ0JBQUtDLFNBQUwsRUFBZ0IsUUFBaEIsQ0FBakI7O0FBRUEsU0FBU0wsV0FBVCxDQUFxQk0sSUFBckIsRUFBMkI7QUFDaEMsVUFBUUEsSUFBUjtBQUNFLFNBQUssT0FBTDtBQUNFLGFBQU8sZ0JBQUtGLFFBQUwsRUFBZSxXQUFmLENBQVA7QUFDRixTQUFLLFFBQUw7QUFDRSxhQUFPLGdCQUFLQSxRQUFMLEVBQWUsWUFBZixDQUFQO0FBQ0Y7QUFDRSxZQUFNLElBQUlHLEtBQUosbUNBQXdDRCxJQUF4QyxDQUFOO0FBTko7QUFRRDs7QUFFTSxTQUFTTCxNQUFULENBQWdCSyxJQUFoQixFQUFzQjtBQUMzQixNQUFNRSxXQUFXUixZQUFZTSxJQUFaLENBQWpCOztBQUVBLGtDQUFvQkYsUUFBcEI7O0FBRUEsTUFBSTtBQUNGLHdCQUFXSSxRQUFYO0FBQ0QsR0FGRCxDQUVFLE9BQU9DLENBQVAsRUFBVTtBQUNWLFdBQU8sSUFBUDtBQUNEOztBQUVELFNBQU8sc0JBQWFELFFBQWIsRUFBdUJFLFFBQXZCLENBQWdDLE1BQWhDLENBQVA7QUFDRDs7QUFFTSxTQUFTUixZQUFULENBQXNCSSxJQUF0QixFQUE0QkssR0FBNUIsRUFBaUM7QUFDdEMsa0NBQW9CUCxRQUFwQjs7QUFFQSx5QkFBY0osWUFBWU0sSUFBWixDQUFkLEVBQWlDSyxHQUFqQztBQUNEOztBQUVNLFNBQVNSLGFBQVQsQ0FBdUJHLElBQXZCLEVBQTZCO0FBQ2xDLGtDQUFvQkYsUUFBcEI7O0FBRUEsTUFBSTtBQUNGLHdCQUFXSixZQUFZTSxJQUFaLENBQVg7QUFDRCxHQUZELENBRUUsT0FBT00sR0FBUCxFQUFZO0FBQ1o7QUFDRDtBQUNGIiwiZmlsZSI6InBpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVubGlua1N5bmMsIHdyaXRlRmlsZVN5bmMsIGFjY2Vzc1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IG1rZGlySWZOb3RFeGlzdFN5bmMgfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGNvbnN0IFRNUF9QQVRIID0gam9pbihfX2Rpcm5hbWUsICcuLi90bXAnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKHR5cGUpIHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnbG9jYWwnOlxuICAgICAgcmV0dXJuIGpvaW4oVE1QX1BBVEgsICdsb2NhbC5waWQnKTtcbiAgICBjYXNlICdzZXJ2ZXInOlxuICAgICAgcmV0dXJuIGpvaW4oVE1QX1BBVEgsICdzZXJ2ZXIucGlkJyk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAndHlwZScgb2YgZmlsZW5hbWUgJHt0eXBlfWApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQaWQodHlwZSkge1xuICBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKHR5cGUpO1xuXG4gIG1rZGlySWZOb3RFeGlzdFN5bmMoVE1QX1BBVEgpO1xuXG4gIHRyeSB7XG4gICAgYWNjZXNzU3luYyhmaWxlTmFtZSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiByZWFkRmlsZVN5bmMoZmlsZU5hbWUpLnRvU3RyaW5nKCd1dGY4Jyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVBpZEZpbGUodHlwZSwgcGlkKSB7XG4gIG1rZGlySWZOb3RFeGlzdFN5bmMoVE1QX1BBVEgpO1xuXG4gIHdyaXRlRmlsZVN5bmMoZ2V0RmlsZU5hbWUodHlwZSksIHBpZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWxldGVQaWRGaWxlKHR5cGUpIHtcbiAgbWtkaXJJZk5vdEV4aXN0U3luYyhUTVBfUEFUSCk7XG5cbiAgdHJ5IHtcbiAgICB1bmxpbmtTeW5jKGdldEZpbGVOYW1lKHR5cGUpKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gYWxyZWF5IHVubGlua2VkXG4gIH1cbn1cbiJdfQ==