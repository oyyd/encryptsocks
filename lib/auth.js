'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.createAuthInfo = createAuthInfo;
exports.validate = validate;
function createAuthInfo(config) {
  var auth = config.auth;

  var info = {
    forceAuth: false
  };

  if (auth && auth.forceAuth) {
    info.forceAuth = true;
  }

  if (!info.forceAuth) {
    return {
      info: info
    };
  }

  var usernamePassword = auth.usernamePassword;


  if (!usernamePassword || (typeof usernamePassword === 'undefined' ? 'undefined' : _typeof(usernamePassword)) !== 'object') {
    return {
      info: info,
      error: 'expect "usernamePassword" in your config file to be an object'
    };
  }

  var keys = Object.keys(usernamePassword);

  if (keys.length === 0) {
    return {
      info: info,
      warn: 'no valid username/password found in your config file'
    };
  }

  info.usernamePassword = usernamePassword;

  return {
    info: info
  };
}

function validate(info, username, password) {
  return info.usernamePassword[username] === password;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hdXRoLmpzIl0sIm5hbWVzIjpbImNyZWF0ZUF1dGhJbmZvIiwidmFsaWRhdGUiLCJjb25maWciLCJhdXRoIiwiaW5mbyIsImZvcmNlQXV0aCIsInVzZXJuYW1lUGFzc3dvcmQiLCJlcnJvciIsImtleXMiLCJPYmplY3QiLCJsZW5ndGgiLCJ3YXJuIiwidXNlcm5hbWUiLCJwYXNzd29yZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O1FBQWdCQSxjLEdBQUFBLGM7UUF5Q0FDLFEsR0FBQUEsUTtBQXpDVCxTQUFTRCxjQUFULENBQXdCRSxNQUF4QixFQUFnQztBQUFBLE1BQzdCQyxJQUQ2QixHQUNwQkQsTUFEb0IsQ0FDN0JDLElBRDZCOztBQUVyQyxNQUFNQyxPQUFPO0FBQ1hDLGVBQVc7QUFEQSxHQUFiOztBQUlBLE1BQUlGLFFBQVFBLEtBQUtFLFNBQWpCLEVBQTRCO0FBQzFCRCxTQUFLQyxTQUFMLEdBQWlCLElBQWpCO0FBQ0Q7O0FBRUQsTUFBSSxDQUFDRCxLQUFLQyxTQUFWLEVBQXFCO0FBQ25CLFdBQU87QUFDTEQ7QUFESyxLQUFQO0FBR0Q7O0FBZG9DLE1BZ0I3QkUsZ0JBaEI2QixHQWdCUkgsSUFoQlEsQ0FnQjdCRyxnQkFoQjZCOzs7QUFrQnJDLE1BQUksQ0FBQ0EsZ0JBQUQsSUFBcUIsUUFBT0EsZ0JBQVAseUNBQU9BLGdCQUFQLE9BQTRCLFFBQXJELEVBQStEO0FBQzdELFdBQU87QUFDTEYsZ0JBREs7QUFFTEcsYUFBTztBQUZGLEtBQVA7QUFJRDs7QUFFRCxNQUFNQyxPQUFPQyxPQUFPRCxJQUFQLENBQVlGLGdCQUFaLENBQWI7O0FBRUEsTUFBSUUsS0FBS0UsTUFBTCxLQUFnQixDQUFwQixFQUF1QjtBQUNyQixXQUFPO0FBQ0xOLGdCQURLO0FBRUxPLFlBQU07QUFGRCxLQUFQO0FBSUQ7O0FBRURQLE9BQUtFLGdCQUFMLEdBQXdCQSxnQkFBeEI7O0FBRUEsU0FBTztBQUNMRjtBQURLLEdBQVA7QUFHRDs7QUFFTSxTQUFTSCxRQUFULENBQWtCRyxJQUFsQixFQUF3QlEsUUFBeEIsRUFBa0NDLFFBQWxDLEVBQTRDO0FBQ2pELFNBQU9ULEtBQUtFLGdCQUFMLENBQXNCTSxRQUF0QixNQUFvQ0MsUUFBM0M7QUFDRCIsImZpbGUiOiJhdXRoLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUF1dGhJbmZvKGNvbmZpZykge1xuICBjb25zdCB7IGF1dGggfSA9IGNvbmZpZztcbiAgY29uc3QgaW5mbyA9IHtcbiAgICBmb3JjZUF1dGg6IGZhbHNlLFxuICB9O1xuXG4gIGlmIChhdXRoICYmIGF1dGguZm9yY2VBdXRoKSB7XG4gICAgaW5mby5mb3JjZUF1dGggPSB0cnVlO1xuICB9XG5cbiAgaWYgKCFpbmZvLmZvcmNlQXV0aCkge1xuICAgIHJldHVybiB7XG4gICAgICBpbmZvLFxuICAgIH07XG4gIH1cblxuICBjb25zdCB7IHVzZXJuYW1lUGFzc3dvcmQgfSA9IGF1dGg7XG5cbiAgaWYgKCF1c2VybmFtZVBhc3N3b3JkIHx8IHR5cGVvZiB1c2VybmFtZVBhc3N3b3JkICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB7XG4gICAgICBpbmZvLFxuICAgICAgZXJyb3I6ICdleHBlY3QgXCJ1c2VybmFtZVBhc3N3b3JkXCIgaW4geW91ciBjb25maWcgZmlsZSB0byBiZSBhbiBvYmplY3QnLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModXNlcm5hbWVQYXNzd29yZCk7XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGluZm8sXG4gICAgICB3YXJuOiAnbm8gdmFsaWQgdXNlcm5hbWUvcGFzc3dvcmQgZm91bmQgaW4geW91ciBjb25maWcgZmlsZScsXG4gICAgfTtcbiAgfVxuXG4gIGluZm8udXNlcm5hbWVQYXNzd29yZCA9IHVzZXJuYW1lUGFzc3dvcmQ7XG5cbiAgcmV0dXJuIHtcbiAgICBpbmZvLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGUoaW5mbywgdXNlcm5hbWUsIHBhc3N3b3JkKSB7XG4gIHJldHVybiBpbmZvLnVzZXJuYW1lUGFzc3dvcmRbdXNlcm5hbWVdID09PSBwYXNzd29yZDtcbn1cbiJdfQ==