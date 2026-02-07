const NodeBlockService = require('./NodeBlockService');
const AMRStateManager = require('../state/AMRStateManager');
const AMRLogger = require('../utils/AMRLogger');
const socketEmitter = require('../socket/AMRSocketEmitter');

class AMREventHandler {
  /**
   * Xử lý event JackUpload (AMR nhận hàng)
   * @param {string} amrId - ID của AMR
   * @param {string} nodeId - ID của node nơi thực hiện jackupload
   */
  async handleJackUpload(amrId, nodeId) {
    try {
      AMRLogger.info('EventHandler', `Processing JackUpload event`, { amrId, nodeId });

      // 1. Thêm node vào blocked list
      await NodeBlockService.addBlockedNode(nodeId, amrId, 'jackupload');

      // 2. Cập nhật cargo status
      await AMRStateManager.updateCargoFromEvent(amrId, 'jackupload');

      // 3. Emit socket event
      socketEmitter.emitCargoLoaded({
        amrId,
        nodeId,
        timestamp: Date.now(),
      });

      socketEmitter.emitNodeBlocked({
        nodeId,
        amrId,
        reason: 'jackupload',
        timestamp: Date.now(),
      });

      AMRLogger.info('EventHandler', `JackUpload processed successfully`, { amrId, nodeId });
      return { success: true, amrId, nodeId };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Failed to handle JackUpload', error);
      throw error;
    }
  }

  /**
   * Xử lý event JackLoad (AMR giao hàng)
   * @param {string} amrId - ID của AMR
   * @param {string} nodeId - ID của node nơi thực hiện jackload
   */
  async handleJackLoad(amrId, nodeId) {
    try {
      AMRLogger.info('EventHandler', `Processing JackLoad event`, { amrId, nodeId });

      // 1. Xóa node khỏi blocked list
      await NodeBlockService.removeBlockedNode(nodeId);

      // 2. Cập nhật cargo status
      await AMRStateManager.updateCargoFromEvent(amrId, 'jackload');

      // 3. Emit socket event
      socketEmitter.emitCargoUnloaded({
        amrId,
        nodeId,
        timestamp: Date.now(),
      });

      socketEmitter.emitNodeUnblocked({
        nodeId,
        amrId,
        timestamp: Date.now(),
      });

      AMRLogger.info('EventHandler', `JackLoad processed successfully`, { amrId, nodeId });
      return { success: true, amrId, nodeId };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Failed to handle JackLoad', error);
      throw error;
    }
  }

  /**
   * Xử lý event cập nhật vị trí AMR
   * @param {string} amrId - ID của AMR
   * @param {Object} locationData - Dữ liệu vị trí {x, y, angle, current_node}
   */
  async handleLocationUpdate(amrId, locationData) {
    try {
      // Cập nhật location trong state
      await AMRStateManager.updateLocation(amrId, locationData);

      // Emit socket event
      socketEmitter.emitLocationUpdate({
        amrId,
        ...locationData,
        timestamp: Date.now(),
      });

      return { success: true, amrId };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Failed to handle location update', error);
      throw error;
    }
  }

  /**
   * Xử lý event operation complete (từ AMR)
   * @param {string} amrId - ID của AMR
   * @param {Object} operationData - Dữ liệu operation {type, nodeId, success}
   */
  async handleOperationComplete(amrId, operationData) {
    try {
      const { type, nodeId, success } = operationData;

      AMRLogger.info('EventHandler', `Operation complete`, { amrId, type, nodeId, success });

      if (!success) {
        AMRLogger.warn('EventHandler', `Operation failed`, { amrId, type, nodeId });
        return { success: false, amrId, type };
      }

      // Xử lý dựa trên loại operation
      if (type === 'jackupload') {
        await this.handleJackUpload(amrId, nodeId);
      } else if (type === 'jackload') {
        await this.handleJackLoad(amrId, nodeId);
      }

      return { success: true, amrId, type };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Failed to handle operation complete', error);
      throw error;
    }
  }

  /**
   * Cleanup: Xóa tất cả blocked nodes của một AMR khi AMR offline
   * @param {string} amrId - ID của AMR
   */
  async handleAMROffline(amrId) {
    try {
      AMRLogger.info('EventHandler', `AMR offline, cleaning up blocked nodes`, { amrId });

      await NodeBlockService.clearBlockedNodesByAMR(amrId);

      socketEmitter.emitAMROffline({
        amrId,
        timestamp: Date.now(),
      });

      return { success: true, amrId };
    } catch (error) {
      AMRLogger.error('EventHandler', 'Failed to handle AMR offline', error);
      throw error;
    }
  }
}

module.exports = new AMREventHandler();
