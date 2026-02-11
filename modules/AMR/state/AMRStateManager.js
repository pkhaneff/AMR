const RedisStorage = require('../storage/RedisStorage');
const AMRLogger = require('../utils/AMRLogger');

class AMRStateManager {
  constructor() {
    this.statePrefix = 'amr:state:';
    this.allStatesKey = 'amr:states:all';
  }

  async getState(amrId) {
    return await RedisStorage.get(`${this.statePrefix}${amrId}`);
  }

  async getAllStates() {
    const amrIds = await RedisStorage.sMembers(this.allStatesKey);
    const states = [];

    for (const amrId of amrIds) {
      const state = await this.getState(amrId);
      if (state) states.push(state);
    }

    return states;
  }

  async saveState(amrId, state) {
    await RedisStorage.save(`${this.statePrefix}${amrId}`, state);
    await RedisStorage.sAdd(this.allStatesKey, amrId);
  }

  async setStatus(amrId, status) {
    const state = await this.getState(amrId) || { amrId };
    state.status = status;
    state.updatedAt = Date.now();
    await this.saveState(amrId, state);
  }

  async setCargoStatus(amrId, hasCargo) {
    const state = await this.getState(amrId) || { amrId };
    state.hasCargo = Boolean(hasCargo);
    state.updatedAt = Date.now();
    await this.saveState(amrId, state);
    AMRLogger.state('Cargo status updated', { amrId, hasCargo });
  }

  async getCargoStatus(amrId) {
    const state = await this.getState(amrId);
    return state ? state.hasCargo || false : false;
  }

  async updateCoordinates(amrId, coordinates) {
    const state = await this.getState(amrId) || { amrId };
    state.coordinates = coordinates;
    state.currentNode = coordinates.current_node || state.currentNode;
    state.updatedAt = Date.now();
    await this.saveState(amrId, state);
  }

  async incrementSteps(amrId) {
    const state = await this.getState(amrId) || { amrId };
    state.stepsTaken = (state.stepsTaken || 0) + 1;
    await this.saveState(amrId, state);
  }

  async updateLocation(amrId, locationData) {
    const state = await this.getState(amrId) || { amrId };
    state.location = locationData;
    state.updatedAt = Date.now();
    await this.saveState(amrId, state);
  }
}

module.exports = new AMRStateManager();
