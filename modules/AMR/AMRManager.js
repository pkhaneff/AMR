const AMRApiClient = require('./api/AMRApiClient');
const StatusPoller = require('./polling/StatusPoller');
const PollerManager = require('./polling/PollerManager');
const RedisStorage = require('./storage/RedisStorage');
const MotionController = require('./control/MotionController');
const TaskController = require('./control/TaskController');
const ConfigController = require('./control/ConfigController');

// Legacy modules removed after refactor

class AMRManager {
  constructor() {
    this.amrs = new Map();
    this.pollerManager = new PollerManager();
    this.storage = RedisStorage;
    this.executor = null;
  }

  setEventHandler(handler) {
    this.eventHandler = handler;
    console.log('[AMRManager] Event handler set');
  }

  initialize(configs) {
    configs.forEach((config) => this.addAMR(config));
    console.log(`[AMRManager] Initialized ${this.amrs.size} AMRs`);
  }

  addAMR(config) {
    const { id, ip, port } = config;
    const apiClient = new AMRApiClient(id, ip, port);

    this.amrs.set(id, {
      id,
      ip,
      port,
      apiClient,
      motion: new MotionController(apiClient),
      task: new TaskController(apiClient),
      config: new ConfigController(apiClient),
    });

    this.pollerManager.addPoller(id, new StatusPoller(apiClient, this.storage));
    console.log(`[AMRManager] Added AMR ${id} (${ip}:${port})`);
  }

  removeAMR(amrId) {
    this.pollerManager.removePoller(amrId);
    this.amrs.delete(amrId);
  }

  startPolling() {
    this.pollerManager.startAll();
  }
  stopPolling() {
    this.pollerManager.stopAll();
  }

  async getAMRData(amrId) {
    const poller = this.pollerManager.getPoller(amrId);
    return poller ? await poller.getCurrentData() : null;
  }

  getAMR(amrId) {
    return this.amrs.get(amrId);
  }
  getAllAMRs() {
    return Array.from(this.amrs.values());
  }

  async controlAMR(amrId, action, params = {}) {
    const amr = this.getAMR(amrId);
    if (!amr) {
      throw new Error(`AMR ${amrId} not found`);
    }

    const { motion, task } = amr;
    const actions = {
      move: () => motion.moveToTarget(params.target),
      stop: () => motion.stopMovement(),
      pause: () => task.pauseTask(),
      resume: () => task.resumeTask(),
      cancel: () => task.cancelTask(),
    };

    if (!actions[action]) {
      throw new Error(`Unknown action: ${action}`);
    }
    return await actions[action]();
  }

  async executeTask(amrId, taskRequest) {
    const amr = this.getAMR(amrId);
    if (!amr) {
      throw new Error(`AMR ${amrId} not found`);
    }

    const { target } = taskRequest;
    if (target) {
      await amr.apiClient.goToTarget(target);
      return { success: true, data: { amr_id: amrId, target } };
    }

    throw new Error('Task request must include target');
  }
}

module.exports = AMRManager;
