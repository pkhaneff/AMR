const AMRApiClient = require('./api/AMRApiClient');
const StatusPoller = require('./polling/StatusPoller');
const PollerManager = require('./polling/PollerManager');
const RedisStorage = require('./storage/RedisStorage');
const MotionController = require('./control/MotionController');
const TaskController = require('./control/TaskController');
const ConfigController = require('./control/ConfigController');
const amrService = require('./services/amr.service');
const AMRTaskExecutor = require('./services/AMRTaskExecutor');

class AMRManager {
  constructor() {
    this.amrs = new Map();
    this.pollerManager = new PollerManager();
    this.storage = new RedisStorage();
    this.executor = null;
  }

  setEventHandler(handler) {
    this.executor = new AMRTaskExecutor(handler);
    console.log('[AMRManager] Event handler and executor set');
  }

  initialize(configs) {
    configs.forEach((config) => this.addAMR(config));
    console.log(`[AMRManager] Initialized ${this.amrs.size} AMRs`);
  }

  addAMR(config) {
    const { id, ip } = config;
    const apiClient = new AMRApiClient(id, ip);

    this.amrs.set(id, {
      id,
      ip,
      apiClient,
      motion: new MotionController(apiClient),
      task: new TaskController(apiClient),
      config: new ConfigController(apiClient),
    });

    this.pollerManager.addPoller(id, new StatusPoller(apiClient, this.storage));
    console.log(`[AMRManager] Added AMR ${id} (${ip})`);
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
    const { start, end, action } = taskRequest;
    const { move_task_list } = amrService.generatePath(start, end, action);

    const amr = this.getAMR(amrId);
    if (!amr) {
      throw new Error(`AMR ${amrId} not found`);
    }

    await amr.apiClient.goToTargetList(move_task_list);
    return { success: true, data: { move_task_list, amr_id: amrId, start, end, action } };
  }

  async executeTaskAsync(taskData) {
    const amr = this.getAMR(taskData.amrId);
    if (!amr) {
      throw new Error(`AMR ${taskData.amrId} not found`);
    }
    if (!this.executor) {
      throw new Error('Executor not initialized');
    }

    // Note: amrService should have been used to prepare taskData.path and taskData.move_task_list
    return this.executor.execute(amr, taskData);
  }
}

module.exports = AMRManager;

module.exports = AMRManager;
