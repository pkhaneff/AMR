const eventEmitter = require('../../../socket/events/EventEmitter');
const { AMR_EVENTS } = require('../../../socket/events/EventTypes');
const AMRLogger = require('../utils/AMRLogger');

class AMRSocketEmitter {
  /**
   * Emit event khi node bị block
   */
  emitNodeBlocked(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.NODE_BLOCKED, data);
      AMRLogger.info('SocketEmitter', 'Node blocked event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit node blocked', error);
    }
  }

  /**
   * Emit event khi node được unblock
   */
  emitNodeUnblocked(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.NODE_UNBLOCKED, data);
      AMRLogger.info('SocketEmitter', 'Node unblocked event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit node unblocked', error);
    }
  }

  /**
   * Emit event khi AMR nhận hàng (cargo loaded)
   */
  emitCargoLoaded(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.CARGO_LOADED, data);
      AMRLogger.info('SocketEmitter', 'Cargo loaded event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit cargo loaded', error);
    }
  }

  /**
   * Emit event khi AMR giao hàng (cargo unloaded)
   */
  emitCargoUnloaded(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.CARGO_UNLOADED, data);
      AMRLogger.info('SocketEmitter', 'Cargo unloaded event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit cargo unloaded', error);
    }
  }

  /**
   * Emit event khi AMR bắt đầu U-turn
   */
  emitUTurnStarted(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.UTURN_STARTED, data);
      AMRLogger.info('SocketEmitter', 'U-turn started event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit U-turn started', error);
    }
  }

  /**
   * Emit event khi AMR hoàn thành U-turn
   */
  emitUTurnCompleted(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.UTURN_COMPLETED, data);
      AMRLogger.info('SocketEmitter', 'U-turn completed event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit U-turn completed', error);
    }
  }

  /**
   * Emit event khi AMR thất bại U-turn
   */
  emitUTurnFailed(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.UTURN_FAILED, data);
      AMRLogger.info('SocketEmitter', 'U-turn failed event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit U-turn failed', error);
    }
  }

  /**
   * Emit event khi cập nhật vị trí AMR
   */
  emitLocationUpdate(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.LOCATION_UPDATE, data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit location update', error);
    }
  }

  /**
   * Emit event khi AMR offline
   */
  emitAMROffline(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.AMR_OFFLINE, data);
      AMRLogger.info('SocketEmitter', 'AMR offline event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit AMR offline', error);
    }
  }

  emitRerouteStarted(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.REROUTE_STARTED, data);
      AMRLogger.info('SocketEmitter', 'Re-route started event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit re-route started', error);
    }
  }

  emitRerouteSuccess(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.REROUTE_SUCCESS, data);
      AMRLogger.info('SocketEmitter', 'Re-route success event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit re-route success', error);
    }
  }

  emitRerouteFailed(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.REROUTE_FAILED, data);
      AMRLogger.info('SocketEmitter', 'Re-route failed event emitted', data);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit re-route failed', error);
    }
  }

  emitMoving(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.AMR_MOVING, data);
      AMRLogger.info('SocketEmitter', `AMR moving: ${data.from} → ${data.to}`);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit moving', error);
    }
  }

  emitArrived(data) {
    try {
      eventEmitter.emit(AMR_EVENTS.AMR_ARRIVED, data);
      AMRLogger.info('SocketEmitter', `AMR arrived at ${data.nodeId}`);
    } catch (error) {
      AMRLogger.error('SocketEmitter', 'Failed to emit arrived', error);
    }
  }
}

module.exports = new AMRSocketEmitter();
