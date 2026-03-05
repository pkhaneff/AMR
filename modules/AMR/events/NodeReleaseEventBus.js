const { EventEmitter } = require('events');
const AMRLogger = require('../utils/AMRLogger');

class NodeReleaseEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many AMRs
  }

  notifyNodeReleased(nodeId, releasedBy) {
    AMRLogger.debug('EventBus', `Node ${nodeId} released by ${releasedBy}`);
    this.emit('node:released', { nodeId, releasedBy, timestamp: Date.now() });
  }

  notifyAMRArrived(amrId, nodeId) {
    AMRLogger.debug('EventBus', `AMR ${amrId} arrived at ${nodeId}`);
    this.emit('amr:arrived', { amrId, nodeId, timestamp: Date.now() });
  }

  notifyAMRLeft(amrId, nodeId) {
    AMRLogger.debug('EventBus', `AMR ${amrId} left ${nodeId}`);
    this.emit('amr:left', { amrId, nodeId, timestamp: Date.now() });
  }

  onNodeReleased(callback) {
    this.on('node:released', callback);
  }

  onAMRArrived(callback) {
    this.on('amr:arrived', callback);
  }

  onAMRLeft(callback) {
    this.on('amr:left', callback);
  }

  removeAllListeners() {
    super.removeAllListeners();
  }
}

module.exports = new NodeReleaseEventBus();
