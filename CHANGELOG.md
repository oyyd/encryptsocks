# CHANGELOG

## master

## 1.1.3

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
