import { startServer } from './ssLocal';
import logger, { changeLevel } from './logger';

process.on('message', config => {
  const level = config.level;

  if (level) {
    changeLevel(logger, level);
  }

  startServer(config);
});
