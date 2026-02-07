require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { initializeSocket, amrEventHandler } = require('./socket');
const setupRoutes = require('./api/routes');
const { notFoundHandler, errorHandler } = require('./middleware');
const { logger } = require('./config/logger');

const amr = require('./modules/AMR');

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

setupRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    amr.setEventHandler(amrEventHandler);
    amr.initializePolling();

    logger.info('[Server] AMR system initialized successfully!');

    server.listen(PORT, () => {
      logger.info(`[Server] AMR Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer();
