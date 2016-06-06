# shadowsocks-js

[![npm-version](https://img.shields.io/npm/v/shadowsocks-js.svg?style=flat-square)](https://www.npmjs.com/package/shadowsocks-js)
[![travis-ci build](https://travis-ci.org/oyyd/shadowsocks-js.svg)](https://travis-ci.org/oyyd/shadowsocks-js)

Yet another [shadowsocks](https://shadowsocks.org/) implementation for [nodejs](https://github.com/shadowsocks/shadowsocks-nodejs) to help you bypass firewalls.

* [Why another Nodejs implementation? (with Benchmark)](https://github.com/oyyd/shadowsocks-js#why-another-nodejs-implementation)
* [CLI](https://github.com/oyyd/shadowsocks-js#cli)
* [Examples](https://github.com/oyyd/shadowsocks-js#examples)
* [Config](https://github.com/oyyd/shadowsocks-js#config)


## Why another Nodejs implementation?

Shadowsocks is a light weight and efficient proxy tunnel and __nodejs is a very good choice to achieve both flexibility and good performance in this situation__.

And I have found that many of who are familiar with [shadowsocks-nodejs](https://github.com/shadowsocks/shadowsocks-nodejs) may be curious about the memory usage so that I have finished some simple benchmarks to measure its behavior.

### Benchmark

You can get the benchmark details [here](benchmark/README.md) or even test your own shadowsocks implementation.

After some simple benchmarks that compare both the node and python implementation, my conclusion is:

1. Node has a different GC strategy but it's, of course, able to keep thousands of connections with a reasonable memory usage. [It's not a bug, it's a conscious time/space trade-off](https://github.com/nodejs/node-v0.x-archive/issues/4525).

2. Each request would cost less time to get responsed (even 50% less time in some situations).

3. Node implementation is less likely to fail requests in high concurrency situation.

And the higher concurrency benchmarks may be meaningless as the bandwidth and network environment would become the actual bottleneck in the real world.

**Do Please** point out my faults if I have missed something or get something wrong.

## Requirement

node >= v4

It's recommended to use node v6 to achieve better performance.

Shadowsocks-js has been tested in osx and ubuntu 14 but it's also expected to work in
windows.

## Installation

```
$ npm i -g shadowsocks-js
```

## CLI

Use `localssjs` (local ssjs) to start clients to communicate with applications. The `localssjs` server will also serve a [pac](https://en.wikipedia.org/wiki/PAC) file at `http://127.0.0.1:8090` (by default) for your apps to avoid unnecessary tunnel work.

You may prefer to navigate [clients page](https://shadowsocks.org/en/download/clients.html) and choose clients for your devices instead of using `localssjs`.

Use `serverssjs` (server ssjs) to start your remote server.

Use `localssjs -h` or `serverssjs -h` to show cli options:

```
Proxy options:
  -c config                     path to config file
  -s SERVER_ADDR                server address, default: 127.0.0.1
  -p SERVER_PORT                server port, default: 8083
  -l LOCAL_ADDR                 local binding address, default: 127.0.0.1
  -b LOCAL_PORT                 local port, default: 1080
  -k PASSWORD                   password
  -m METHOD                     encryption method, default: aes-128-cfb
  -t TIMEOUT                    timeout in seconds, default: 600
  --pac_port PAC_PORT           PAC file server port, default: 8090
  --pac_update_gfwlist [URL]    [localssjs] Update the gfwlist
                                for PAC server. You can specify the
                                request URL.
  --level LOG_LEVEL             log level, default: warn
                                example: --level verbose
General options:
  -h, --help                    show this help message and exit
  -d start/stop/restart         daemon mode
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

Update GFWList for your .pac file server:

```
$ localssjs --pac_update_gfwlist
```

Update GFWList for your .pac file server from a specific URL (default [url](https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt)):

```
$ localssjs --pac_update_gfwlist http://firefoxfan.cc/gfwlist/gfwlist.txt
```

## Config

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

## [Optimizing Shadowsocks](https://github.com/Long-live-shadowsocks/shadowsocks/wiki/Optimizing-Shadowsocks)

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
