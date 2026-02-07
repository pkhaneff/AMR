const socketServer = require('./core/SocketServer');
const connectionManager = require('./core/ConnectionManager');
const eventEmitter = require('./events/EventEmitter');
const amrEventHandler = require('./events/handlers/AMREventHandler');

function initializeSocket(httpServer, config = {}) {
  const io = socketServer.initialize(httpServer, config);
  connectionManager.initialize(io);
  return io;
}

function getSocketIO() {
  return socketServer.getIO();
}

module.exports = {
  initializeSocket,
  getSocketIO,
  socketServer,
  connectionManager,
  eventEmitter,
  amrEventHandler,
};
