const UnifiedBlockStore = require('../storage/UnifiedBlockStore');
const AMRStateManager = require('../state/AMRStateManager');
const AMRLogger = require('../utils/AMRLogger');
const socketEmitter = require('../socket/AMRSocketEmitter');

class AMREventHandler {
  async handlePickup(amrId, nodeId) {
    try {
      AMRLogger.info('EventHandler', `Processing Pickup`, { amrId, nodeId });

      await UnifiedBlockStore.unblockCargo(nodeId);
      await AMRStateManager.setCargoStatus(amrId, true);

      socketEmitter.emitCargoLoaded({
        amrId,
        nodeId,
        timestamp: Date.now(),
      });

      socketEmitter.emitNodeUnblocked({
        nodeId,
        reason: 'cargo_taken',
        timestamp: Date.now(),
      });

      AMRLogger.info('EventHandler', `Pickup completed`, { amrId, nodeId });
      return { success: true, amrId, nodeId };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Pickup failed', error);
      throw error;
    }
  }

  async handleDropoff(amrId, nodeId) {
    try {
      AMRLogger.info('EventHandler', `Processing Dropoff`, { amrId, nodeId });

      await UnifiedBlockStore.blockCargo(nodeId);
      await UnifiedBlockStore.blockPosition(nodeId, amrId);
      await AMRStateManager.setCargoStatus(amrId, false);

      socketEmitter.emitCargoUnloaded({
        amrId,
        nodeId,
        timestamp: Date.now(),
      });

      socketEmitter.emitNodeBlocked({
        nodeId,
        reason: 'cargo_loaded',
        timestamp: Date.now(),
      });

      AMRLogger.info('EventHandler', `Dropoff completed`, { amrId, nodeId });
      return { success: true, amrId, nodeId };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Dropoff failed', error);
      throw error;
    }
  }

  async handleOperationComplete(amrId, operationData) {
    try {
      const { type, nodeId, success } = operationData;

      AMRLogger.info('EventHandler', `Operation complete`, { amrId, type, nodeId, success });

      if (!success) {
        AMRLogger.warn('EventHandler', `Operation failed`, { amrId, type, nodeId });
        return { success: false, amrId, type };
      }

      if (type === 'pickup') {
        await this.handlePickup(amrId, nodeId);
      } else if (type === 'dropoff') {
        await this.handleDropoff(amrId, nodeId);
      }

      return { success: true, amrId, type };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Operation complete failed', error);
      throw error;
    }
  }
}

module.exports = new AMREventHandler();
