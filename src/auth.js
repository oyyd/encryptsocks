export function createAuthInfo(config) {
  const { auth } = config;
  const info = {
    forceAuth: false,
  };

  if (auth && auth.forceAuth) {
    info.forceAuth = true;
  }

  if (!info.forceAuth) {
    return {
      info,
    };
  }

  const { usernamePassword } = auth;

  if (!usernamePassword || typeof usernamePassword !== 'object') {
    return {
      info,
      error: 'expect "usernamePassword" in your config file to be an object',
    };
  }

  const keys = Object.keys(usernamePassword);

  if (keys.length === 0) {
    return {
      info,
      warn: 'no valid username/password found in your config file',
    };
  }

  info.usernamePassword = usernamePassword;

  return {
    info,
  };
}

export function validate(info, username, password) {
  return info.usernamePassword[username] === password;
}
