const AMRLogger = require('../utils/AMRLogger');
const config = require('../config/uturn.config');

class UTurnCalculator {
  calculateTargetAngle(currentAngle) {
    let targetAngle = currentAngle + 180;

    if (targetAngle >= 360) {
      targetAngle -= 360;
    }

    return targetAngle;
  }

  calculateReversePath(currentPath, currentIndex) {
    if (currentIndex <= 0 || currentIndex >= currentPath.length) {
      return null;
    }

    const reversePath = currentPath.slice(0, currentIndex + 1).reverse();
    return reversePath;
  }

  isAngleWithinThreshold(currentAngle, targetAngle) {
    const threshold = config.uturn.angleThreshold;
    const diff = Math.abs(currentAngle - targetAngle);

    return diff <= threshold || diff >= 360 - threshold;
  }

  validateUTurnPossible(currentNode, path, currentIndex) {
    if (!currentNode || !path || currentIndex < 0) {
      return { possible: false, reason: 'Invalid parameters' };
    }

    if (currentIndex === 0) {
      return { possible: false, reason: 'Already at start position' };
    }

    if (!config.uturn.enabled) {
      return { possible: false, reason: 'U-turn is disabled' };
    }

    return { possible: true };
  }
}

module.exports = new UTurnCalculator();
