import winston from 'winston';

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'warn',
    }),
  ],
});

export default logger;
