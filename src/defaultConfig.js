// proxy options
const DEFAULT_CONFIG = {
  serverAddr: '127.0.0.1',
  serverPort: 8083,
  localAddr: '127.0.0.1',
  localPort: 1080,
  password: 'YOUR_PASSWORD_HERE',
  timeout: 600,
  method: 'aes-128-cfb',
  level: 'warn',

  // ipv6
  localAddrIPv6: '::1',
  serverAddrIPv6: '::1',

  // http proxy
  enableHTTPProxy: true,
  HTTPProxyPort: 8183,

  // dev options
  _recordMemoryUsage: false,
};

export default DEFAULT_CONFIG;
