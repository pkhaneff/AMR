const DataPoller = require('./DataPoller');
const pollingConfig = require('../config/polling.config');
const AMRStateManager = require('../state/AMRStateManager');

class StatusPoller {
  constructor(amrApiClient, storage) {
    this.amrId = amrApiClient.amrId;
    this.apiClient = amrApiClient;
    this.storage = storage;
    this.pollers = {};
  }

  start() {
    this._startLocationPolling();
    console.log(`[StatusPoller] Started for AMR ${this.amrId}`);
  }

  stop() {
    Object.values(this.pollers).forEach((poller) => poller.stop());
    this.pollers = {};
    console.log(`[StatusPoller] Stopped for AMR ${this.amrId}`);
  }

  _startLocationPolling() {
    this.pollers.location = new DataPoller(
      `${this.amrId}-location`,
      () => this.apiClient.getLocation(),
      (data) => AMRStateManager.updateLocation(this.amrId, data),
      pollingConfig.intervals.location,
    );
    this.pollers.location.start();
  }

  async getCurrentData() {
    return await this.storage.get(`amr:${this.amrId}:location`);
  }
}

module.exports = StatusPoller;
