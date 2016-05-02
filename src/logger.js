import winston from 'winston';

const DEFAULT_LEVEL = 'warn';
const DEFAULT_COMMON_OPTIONS = {
  colorize: true,
  timestamp: true,
};
const DEFAULT_FILE_OPTIONS = {
  filename: 'log.log',
};

function createLogData(level) {
  return {
    transports: [
      new (winston.transports.Console)(Object.assign(DEFAULT_COMMON_OPTIONS, {
        level,
      })),
      new (winston.transports.File)(Object.assign(
        DEFAULT_COMMON_OPTIONS, DEFAULT_FILE_OPTIONS, {
          level,
        })),
    ],
  };
}

export function changeLevel(logger, level) {
  logger.configure(createLogData(level));
}

const logger = new (winston.Logger)(createLogData(DEFAULT_LEVEL));

export default logger;
