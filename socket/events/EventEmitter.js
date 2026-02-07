const socketServer = require('../core/SocketServer');
const { logger } = require('../../config/logger');

class EventEmitter {
  emit(eventName, data) {
    try {
      const io = socketServer.getIO();
      io.emit(eventName, data);
      logger.info(`[EventEmitter] Emitted: ${eventName}`);
      return true;
    } catch (error) {
      logger.error(`[EventEmitter] Failed to emit ${eventName}: ${error.message}`);
      return false;
    }
  }

  emitToRoom(room, eventName, data) {
    try {
      const io = socketServer.getIO();
      io.to(room).emit(eventName, data);
      logger.info(`[EventEmitter] Emitted to room ${room}: ${eventName}`);
      return true;
    } catch (error) {
      logger.error(`[EventEmitter] Failed to emit to room: ${error.message}`);
      return false;
    }
  }

  emitToClient(socketId, eventName, data) {
    try {
      const io = socketServer.getIO();
      io.to(socketId).emit(eventName, data);
      return true;
    } catch (error) {
      logger.error(`[EventEmitter] Failed to emit to client: ${error.message}`);
      return false;
    }
  }
}

module.exports = new EventEmitter();
