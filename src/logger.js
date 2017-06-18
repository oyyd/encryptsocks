import winston from 'winston';
import { join } from 'path';
import { mkdirIfNotExistSync } from './utils';

export const LOG_NAMES = {
  LOCAL: 'local.log',
  SERVER: 'server.log',
  DAEMON: 'daemon.log',
};

const PATH_PREFIX = join(__dirname, '../logs');
const DEFAULT_LEVEL = 'warn';
const DEFAULT_COMMON_OPTIONS = {
  colorize: true,
  timestamp: true,
};

// TODO: to be refactored
function createLogData(level, filename, willLogToConsole, notLogToFile) {
  const transports = [];

  if (!notLogToFile) {
    transports.push(
      new winston.transports.File(Object.assign(
        DEFAULT_COMMON_OPTIONS, {
          level, filename,
        })
      )
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
  level = DEFAULT_LEVEL,
  logName,
  willLogToConsole = false,
  notLogToFile = false,
) {
  mkdirIfNotExistSync(PATH_PREFIX);
  const fileName = join(PATH_PREFIX, logName);
  return new winston.Logger(createLogData(
    level, fileName, willLogToConsole, notLogToFile,
  ));
}
