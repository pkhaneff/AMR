const StateRepository = require('./StateRepository');
const StateValidator = require('./StateValidator');
const AMRLogger = require('../utils/AMRLogger');

class AMRStateManager {
  async updateState(amrId, updates) {
    try {
      const currentState = await StateRepository.getState(amrId);

      if (!currentState) {
        const newState = {
          amrId,
          currentNode: updates.currentNode || null,
          status: 'IDLE',
          currentTask: null,
          reservedPath: [],
          battery: updates.battery || 100,
          cargo: updates.cargo || null,
          updatedAt: Date.now(),
        };

        StateValidator.validateState(newState);
        await StateRepository.setState(amrId, newState);

        AMRLogger.state('State initialized', { amrId });
        return newState;
      }

      if (updates.status && updates.status !== currentState.status) {
        const canChange = await StateValidator.canChangeStatus(amrId, updates.status);
        if (!canChange) {
          throw new Error(`Invalid transition: ${currentState.status} -> ${updates.status}`);
        }
      }

      const updatedState = {
        ...currentState,
        ...updates,
        updatedAt: Date.now(),
      };

      await StateRepository.setState(amrId, updatedState);
      return updatedState;
    } catch (error) {
      AMRLogger.error('StateManager', 'Failed to update state', error);
      throw error;
    }
  }

  async getState(amrId) {
    return await StateRepository.getState(amrId);
  }

  async getAllStates() {
    return await StateRepository.getAllStates();
  }

  async getIdleAMRs() {
    return await StateRepository.getStatesByStatus('IDLE');
  }

  async getAMRsByStatus(status) {
    return await StateRepository.getStatesByStatus(status);
  }

  async setCurrentTask(amrId, taskId) {
    return await StateRepository.updateState(amrId, {
      currentTask: taskId,
      status: 'MOVING',
    });
  }

  async clearCurrentTask(amrId) {
    return await StateRepository.updateState(amrId, {
      currentTask: null,
      status: 'IDLE',
      reservedPath: [],
    });
  }

  async updateLocation(amrId, locationData) {
    try {
      const updates = {
        currentNode: locationData.current_node || null,
        coordinates: {
          x: locationData.x,
          y: locationData.y,
          angle: locationData.angle,
        },
        updatedAt: Date.now(),
      };

      await StateRepository.updateState(amrId, updates);
      return updates;
    } catch (error) {
      AMRLogger.error('StateManager', 'Failed to update location', error);
      throw error;
    }
  }

  async setReservedPath(amrId, path) {
    return await StateRepository.updateState(amrId, { reservedPath: path });
  }

  async setCargoStatus(amrId, hasCargo) {
    try {
      const updates = {
        hasCargo: Boolean(hasCargo),
        updatedAt: Date.now(),
      };

      await StateRepository.updateState(amrId, updates);
      AMRLogger.state('Cargo status updated', { amrId, hasCargo });
      return updates;
    } catch (error) {
      AMRLogger.error('StateManager', 'Failed to set cargo status', error);
      throw error;
    }
  }

  async getCargoStatus(amrId) {
    try {
      const state = await StateRepository.getState(amrId);
      return state ? state.hasCargo || false : false;
    } catch (error) {
      AMRLogger.error('StateManager', 'Failed to get cargo status', error);
      return false;
    }
  }

  async updateCargoFromEvent(amrId, eventType) {
    try {
      let hasCargo = false;

      if (eventType === 'jackupload') {
        hasCargo = true;
        AMRLogger.info('StateManager', `AMR ${amrId} loaded cargo`);
      } else if (eventType === 'jackload') {
        hasCargo = false;
        AMRLogger.info('StateManager', `AMR ${amrId} unloaded cargo`);
      } else {
        throw new Error(`Unknown event type: ${eventType}`);
      }

      return await this.setCargoStatus(amrId, hasCargo);
    } catch (error) {
      AMRLogger.error('StateManager', 'Failed to update cargo from event', error);
      throw error;
    }
  }
}

module.exports = new AMRStateManager();
