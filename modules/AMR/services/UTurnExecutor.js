const AMRLogger = require('../utils/AMRLogger');
const config = require('../config/uturn.config');
const UTurnCalculator = require('./UTurnCalculator');

class UTurnExecutor {
  async executeUTurn(amr, currentAngle) {
    const targetAngle = UTurnCalculator.calculateTargetAngle(currentAngle);

    AMRLogger.info('UTurnExecutor', `Starting U-turn`, {
      amrId: amr.id,
      currentAngle,
      targetAngle,
    });

    try {
      const result = await this._performRotation(amr, targetAngle);

      if (result.success) {
        AMRLogger.info('UTurnExecutor', `U-turn completed`, { amrId: amr.id });
      } else {
        AMRLogger.warn('UTurnExecutor', `U-turn failed`, { amrId: amr.id, reason: result.reason });
      }

      return result;
    } catch (error) {
      AMRLogger.error('UTurnExecutor', 'U-turn execution error', error);
      return { success: false, reason: error.message };
    }
  }

  async _performRotation(amr, targetAngle) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          reason: 'Timeout exceeded',
          timeout: config.uturn.timeout,
        });
      }, config.uturn.timeout);

      amr.apiClient
        .rotate(targetAngle)
        .then((response) => {
          clearTimeout(timeout);

          const isWithinThreshold = UTurnCalculator.isAngleWithinThreshold(response.currentAngle, targetAngle);

          resolve({
            success: isWithinThreshold,
            currentAngle: response.currentAngle,
            targetAngle,
            reason: isWithinThreshold ? null : 'Angle not within threshold',
          });
        })
        .catch((error) => {
          clearTimeout(timeout);
          resolve({ success: false, reason: error.message });
        });
    });
  }
}

module.exports = new UTurnExecutor();
