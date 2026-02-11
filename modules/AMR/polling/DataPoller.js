class DataPoller {
  constructor(name, fetchFn, saveFn, intervalMs) {
    this.name = name;
    this.fetchFn = fetchFn;
    this.saveFn = saveFn;
    this.intervalMs = intervalMs;
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this._poll();
    this.intervalId = setInterval(() => this._poll(), this.intervalMs);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
  }

  setInterval(intervalMs) {
    this.intervalMs = intervalMs;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  async _poll() {
    try {
      const data = await this.fetchFn();
      await this.saveFn(data);
    } catch (error) {
    }
  }
}

module.exports = DataPoller;
