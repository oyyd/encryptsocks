# CHANGELOG

## 1.4.1

* Core: Support passing a `proxyOptions` in `pm` instead of creating a config object from `argv`.

## 1.4.0

* Core: Allow to set log path.
* Core: Store list in base64.
* Core: Manage process with `pm2`.

## 1.2.0

* Bug fix: Respect the "serverAddr" option and set default "serverAddr" to "0.0.0.0".

## 1.1.4

* Core: Support http-proxy.

## 1.1.3

* Core: Support SOCKS5 username/password authetication.

## 1.1.2

* Core: Add domain resolving support.

* Bug fix: The option `-c` resolved path incorrectly.

* Bug fix: Windows do not accept kill signals.

## 1.1.1

* Bug fix: `getDstInfo` may return buffers with zero length and throw uncaught error when reading these buffers

## 1.1.0

* Core: Add .pac file server
  * Update rules from gfwlist
  * Support adding user rules

* Core: Seperate log files

* Extra: Add benchmark

## 1.0.4(2016-05-21)

* Bug fix: typo `clientToDst.resumse()`

* Babel: Enable babel loose mode.

## 1.0.3(2016-05-21)

* Change: Do not log timeout warning.
