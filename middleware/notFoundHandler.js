const { logger } = require('../config/logger');

function notFoundHandler(req, res) {
  logger.warn(`[NotFound] ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

module.exports = notFoundHandler;
