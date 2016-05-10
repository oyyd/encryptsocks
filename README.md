# shadowsocks-js (WIP)

Yet another implementation of [shadowsocks-nodejs](https://github.com/shadowsocks/shadowsocks-nodejs).

## Features

## Requirement

Shadowsocks-js has been tested in osx and ubuntu 14 but it's also expected to work in
windows.

## Install

```
$ npm i -g shadowsocks-js
```

## CLI

```
Proxy options:
  -c config              path to config file
  -s SERVER_ADDR         server address, default: 127.0.0.1
  -p SERVER_PORT         server port, default: 8083
  -l LOCAL_ADDR          local binding address, default: 127.0.0.1
  -b LOCAL_PORT          local port, default: 1080
  -k PASSWORD            password
  -m METHOD              encryption method, default: aes-128-cfb
  -t TIMEOUT             timeout in seconds, default: 600
  --level LOG_LEVEL      log level, default: warn,
                         example: --level verbose

General options:
  -h, --help             show this help message and exit
  -d start/stop/restart  daemon mode
```

```
$ sslocal
```

```
$ ssserver
```

## Options

```json
{
  "serverAddr": "127.0.0.1",
  "serverPort": 8083,
  "localAddr": "127.0.0.1",
  "localPort": 1080,
  "password": "YOUR_PASSWORD_HERE",
  "timeout": 60,
  "method": "aes-128-cfb",

  "level": "warn",
  "localAddrIPv6": "::1",
  "serverAddrIPv6": "::1"
}
```

## Encryption methods

* aes-128-cfb
* aes-192-cfb
* aes-256-cfb
* bf-cfb
* camellia-128-cfb
* camellia-192-cfb
* camellia-256-cfb
* cast5-cfb
* des-cfb
* idea-cfb
* rc2-cfb
* rc4
* rc4-md5
* seed-cfb

## Test

```
$ npm test
```

## About the support to UDP relay

## License

BSD
