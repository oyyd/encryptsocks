# shadowsocks-js

Yet another [shadowsocks](https://shadowsocks.org/) implementation for [nodejs](https://github.com/shadowsocks/shadowsocks-nodejs) to help you bypass firewalls.

## Requirement

Shadowsocks-js has been tested in osx and ubuntu 14 but it's also expected to work in
windows.

## Installation

```
$ npm i -g shadowsocks-js
```

## CLI

Use `localssjs` (local ssjs) to start clients to communicate with applications.

You may prefer to navigate [clients page](https://shadowsocks.org/en/download/clients.html) and choose a desktop client.

clients for your devices instead of using `localssjs`.

Use `serverssjs` (server ssjs) to start your remote server.

Use `localssjs -h` or `serverssjs -h` to show cli options:

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

### Examples

Start clients that bind at `1088`:

```
$ localssjs -b 1088
```

Start daemon:

```
$ localssjs -d start -b 1080
```

Log verbosely:

```
$ serverssjs -d start --level verbose
```

## Options

```json
{
  "serverAddr": "127.0.0.1",
  "serverPort": 8083,
  "localAddr": "127.0.0.1",
  "localPort": 1080,
  "password": "YOUR_PASSWORD_HERE",
  "timeout": 600,
  "method": "aes-128-cfb",

  "level": "warn",
  "localAddrIPv6": "::1",
  "serverAddrIPv6": "::1"
}
```

Specify your config file with `-c` flag:

```
$ serverssjs -c config.json
```

You can change default config in `config.json` file of your global shadowsocks-js
package.

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

## Contribute

```
$ npm run watch
```

## About the support to UDP relay

I intend to implement UDP relay and I have implement it in shadowsocks-js
but I can't find an effective way to test this in real world networking.
Please create issues to help us if you know any applications that support
UDP-socks well.

## License

BSD
