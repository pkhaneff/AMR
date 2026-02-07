const { createClient } = require('redis');
const { logger } = require('../config/logger');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.info(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
    connectTimeout: 10000,
  },
});

redis.on('connect', () => {
  logger.info('✓ Redis connected');
});

redis.on('ready', () => {
  logger.info('✓ Redis client ready');
});

redis.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

redis.on('reconnecting', () => {
  logger.info('⟳ Redis reconnecting...');
});

redis.on('end', () => {
  logger.info('✗ Redis connection closed');
});

(async () => {
  try {
    await redis.connect();
  } catch (error) {
    logger.error(`Failed to connect to Redis: ${error.message}`);
    process.exit(1);
  }
})();

module.exports = redis;
