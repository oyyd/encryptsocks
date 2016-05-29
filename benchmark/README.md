# benchmark

__NOTE:__ Make sure you are using node v6.

This benchmark assumes your ss client is listening on port `1080`. You can also use this to test other ss implementation.

```
$ node benchmark/run
```

Modify `config.js` to play around. You may want to `ulimit` the max number of open file descriptors.

```
$ ulimit -S -n 10000
```

## My Samples

It's meaningless to run this with a even higher `limitConnections`(concurrent) as the bandwidth would become the bottleneck in real world.  

### Environment

OSX 10.11, node v6(default `--max_old_space_size`), python 2.7, both use `localssjs` as the client.

### Configuration

#### shadowsocks

```
$ shadowsocks -c /etc/shadowsocks.json -qq
```

__config.json__

```json
{
    "server":"127.0.0.1",
    "server_port":8083,
    "local_address": "127.0.0.1",
    "local_port":1080,
    "password":"YOUR_PASSWORD_HERE",
    "timeout":300,
    "method":"aes-128-cfb",
    "fast_open": false
}
```

#### shadowsocks-js

```
$ ./bin/serverssjs
```

__config.json__

```json
{
  "serverAddr": "127.0.0.1",
  "serverPort": 8083,
  "localAddr": "127.0.0.1",
  "localPort": 1080,
  "password": "YOUR_PASSWORD_HERE",
  "timeout": 600,
  "method": "aes-128-cfb"
}
```

### Result

#### Example 1

__benchmark config.json__

```js
module.exports = {
  limitConnections: 100, // concurrent
  totalConnection: 4000,
  timeout: 2000, // milliseconds
  baseLine: false,
  fileSize: 500, // kb
};
```

__shadowsocks:__

```
Total: 4000
errorRates = 0%
averageTime = 779.9545612325014ms
timeout = 0
unexpected = 0
```

__shadowsocks-js:__

```
Total: 4000
errorRates = 0%
averageTime = 386.7885057545ms
timeout = 0
unexpected = 0
```

#### Example 2

__benchmark config.json__

```js
module.exports = {
  limitConnections: 500, // concurrent
  totalConnection: 4000,
  timeout: 2000, // milliseconds
  baseLine: false,
  fileSize: 50, // kb
};
```

__shadowsocks:__

```
Total: 4000
errorRates = 38.95%
averageTime = 762.3954610835386ms
timeout = 455
unexpected = 1103
```

__shadowsocks-js:__

```
Total: 4000
errorRates = 0%
averageTime = 644.7608903972514ms
timeout = 0
unexpected = 0
```

Memory usage in this test (every single seconds):

```js
[ { rss: 23248896, heapTotal: 11530240, heapUsed: 5732288 },
  { rss: 51552256, heapTotal: 18870272, heapUsed: 10518800 },
  { rss: 115429376, heapTotal: 30404608, heapUsed: 15605560 },
  { rss: 215781376, heapTotal: 27258880, heapUsed: 10931832 },
  { rss: 208715776, heapTotal: 27258880, heapUsed: 7603168 },
  { rss: 220286976, heapTotal: 28307456, heapUsed: 6845672 },
  { rss: 227180544, heapTotal: 29356032, heapUsed: 10088048 },
  { rss: 227180544, heapTotal: 29356032, heapUsed: 10092864 },
  { rss: 227184640, heapTotal: 29356032, heapUsed: 10096744 } ]
```

#### Example 3

__benchmark config.json__

```js
module.exports = {
  limitConnections: 1000, // concurrent
  totalConnection: 4000,
  timeout: 2000, // milliseconds
  baseLine: false,
  fileSize: 5, // kb
};
```

__shadowsocks:__

```
Total: 4000
errorRates = 23.825%
averageTime = 1216.345400121761ms
timeout = 108
unexpected = 845
```

__shadowsocks-js:__

```
Total: 4000
errorRates = 0.4%
averageTime = 1032.9700106164662ms
timeout = 0
unexpected = 16
```

Memory usage in this test (every single seconds):

```js
[ { rss: 23453696, heapTotal: 11530240, heapUsed: 5962616 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5983016 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5985952 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5987160 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5988368 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5989576 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5990784 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5991992 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5993200 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5994408 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5995616 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5996824 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5998032 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 5999240 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 6000448 },
  { rss: 23490560, heapTotal: 11530240, heapUsed: 6001656 } ]
  ```
