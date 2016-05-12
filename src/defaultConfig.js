const DEFAULT_CONFIG = {
  serverAddr: '127.0.0.1',
  serverPort: 8083,
  localAddr: '127.0.0.1',
  localPort: 1080,
  password: 'YOUR_PASSWORD_HERE',
  timeout: 60,
  method: 'aes-128-cfb',

  level: 'warn',
  localAddrIPv6: '::1',
  serverAddrIPv6: '::1',
};

export default DEFAULT_CONFIG;
