import winston from 'winston';
import { resolve } from 'path';
import { mkdirIfNotExistSync } from './utils';

export const LOG_NAMES = {
  LOCAL: 'local.log',
  SERVER: 'server.log',
  DAEMON: 'daemon.log',
};

const DEFAULT_LEVEL = 'warn';
const DEFAULT_COMMON_OPTIONS = {
  colorize: true,
  timestamp: true,
};

// TODO: to be refactored
function createLogData(level, filename, willLogToConsole, notLogToFile) {
  const transports = [];

  if (filename && !notLogToFile) {
    transports.push(
      new winston.transports.File(Object.assign(
        DEFAULT_COMMON_OPTIONS, {
          level,
          filename,
        }
      ))
    );
  }

  if (willLogToConsole) {
    transports.push(
      new winston.transports.Console(Object.assign(DEFAULT_COMMON_OPTIONS, {
        level,
      }))
    );
  }

  return {
    transports,
  };
}

export function createLogger(
  proxyOptions,
  logName,
  willLogToConsole = false,
  notLogToFile = false,
) {
  const { level = DEFAULT_LEVEL, logPath } = (proxyOptions || {});

  if (logPath) {
    mkdirIfNotExistSync(logPath);
  }

  const fileName = logPath ? resolve(logPath, logName) : null;
  return new winston.Logger(createLogData(
    level, fileName, willLogToConsole, notLogToFile,
  ));
}
