const AMREventHandler = require('../services/AMREventHandler');
const AMRLogger = require('../utils/AMRLogger');

class OperationTrigger {
  async triggerIfExists(step, amrId) {
    if (!step.operation) {
      return null;
    }

    try {
      const result = await AMREventHandler.handleOperationComplete(amrId, {
        type: step.operation,
        nodeId: step.id,
        success: true,
      });

      AMRLogger.info('OperationTrigger', `Triggered operation ${step.operation}`, {
        amrId,
        nodeId: step.id,
      });

      return result;
    } catch (error) {
      AMRLogger.error('OperationTrigger', `Failed to trigger operation`, error);
      throw error;
    }
  }
}

module.exports = new OperationTrigger();
