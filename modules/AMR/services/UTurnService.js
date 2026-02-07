const UTurnCalculator = require('./UTurnCalculator');
const UTurnExecutor = require('./UTurnExecutor');
const AMRStateManager = require('../state/AMRStateManager');
const socketEmitter = require('../socket/AMRSocketEmitter');
const AMRLogger = require('../utils/AMRLogger');

class UTurnService {
  async canUTurn(amrId, currentNode, path, currentIndex) {
    const validation = UTurnCalculator.validateUTurnPossible(currentNode, path, currentIndex);

    if (!validation.possible) {
      return { canUTurn: false, reason: validation.reason };
    }

    const state = await AMRStateManager.getState(amrId);
    if (!state) {
      return { canUTurn: false, reason: 'AMR state not found' };
    }

    if (state.status === 'ERROR') {
      return { canUTurn: false, reason: 'AMR in error state' };
    }

    return { canUTurn: true };
  }

  async performUTurn(amr, currentAngle, taskId) {
    const amrId = amr.id;

    AMRLogger.info('UTurnService', `Initiating U-turn`, { amrId, taskId });

    socketEmitter.emitUTurnStarted({
      amrId,
      taskId,
      currentAngle,
      timestamp: Date.now(),
    });

    const result = await UTurnExecutor.executeUTurn(amr, currentAngle);

    if (result.success) {
      socketEmitter.emitUTurnCompleted({
        amrId,
        taskId,
        finalAngle: result.currentAngle,
        timestamp: Date.now(),
      });
    } else {
      socketEmitter.emitUTurnFailed({
        amrId,
        taskId,
        reason: result.reason,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  calculateReversePath(currentPath, currentIndex) {
    return UTurnCalculator.calculateReversePath(currentPath, currentIndex);
  }
}

module.exports = new UTurnService();
