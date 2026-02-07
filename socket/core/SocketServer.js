const { Server } = require('socket.io');
const { logger } = require('../../config/logger');

class SocketServer {
  constructor() {
    this.io = null;
  }

  initialize(httpServer, config = {}) {
    const defaultConfig = {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    };

    this.io = new Server(httpServer, { ...defaultConfig, ...config });
    logger.info('[SocketServer] Socket.IO initialized');
    return this.io;
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }
    return this.io;
  }
}

module.exports = new SocketServer();
