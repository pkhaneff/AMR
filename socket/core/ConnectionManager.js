const { logger } = require('../../config/logger');

class ConnectionManager {
  constructor() {
    this.io = null;
    this.connections = new Map();
  }

  initialize(io) {
    this.io = io;
    this.setupConnectionHandlers();
  }

  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const clientId = socket.id;
    this.connections.set(clientId, socket);
    logger.info(`[ConnectionManager] Client connected: ${clientId}`);

    socket.on('disconnect', () => {
      this.handleDisconnection(clientId);
    });
  }

  handleDisconnection(clientId) {
    this.connections.delete(clientId);
    logger.info(`[ConnectionManager] Client disconnected: ${clientId}`);
  }

  getConnectionCount() {
    return this.connections.size;
  }
}

module.exports = new ConnectionManager();
