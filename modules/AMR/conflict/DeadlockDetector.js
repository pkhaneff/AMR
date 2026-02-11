const AMRStateManager = require('../state/AMRStateManager');
const AMRLogger = require('../utils/AMRLogger');

class DeadlockDetector {
  async detectDeadlock() {
    const states = await AMRStateManager.getAllStates();

    if (states.length !== 2) {
      AMRLogger.warn('DeadlockDetector', 'Expected 2 AMRs, found', states.length);
      return null;
    }

    const [amr1, amr2] = states;

    if (amr1.status === 'WAITING' && amr2.status === 'WAITING') {
      const victim = this.selectVictim(amr1, amr2);

      AMRLogger.warn('DeadlockDetector', 'Deadlock detected', {
        amr1: amr1.amrId,
        amr2: amr2.amrId,
        victim: victim
      });

      return {
        detected: true,
        amrs: [amr1.amrId, amr2.amrId],
        victim: victim
      };
    }

    return null;
  }

  selectVictim(amr1, amr2) {
    if (amr1.stepsTaken < amr2.stepsTaken) return amr1.amrId;
    if (amr2.stepsTaken < amr1.stepsTaken) return amr2.amrId;

    if (!amr1.hasCargo && amr2.hasCargo) return amr1.amrId;
    if (!amr2.hasCargo && amr1.hasCargo) return amr2.amrId;

    return amr2.amrId;
  }
}

module.exports = new DeadlockDetector();
