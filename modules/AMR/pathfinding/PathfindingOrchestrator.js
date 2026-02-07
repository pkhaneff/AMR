const PathConstraintService = require('./PathConstraintService');
const AMRStateManager = require('../state/AMRStateManager');

class PathfindingOrchestrator {
  async prepareConstraints(amrId) {
    const hasCargo = await AMRStateManager.getCargoStatus(amrId);

    if (!hasCargo) {
      return { restrictedNodes: [] };
    }

    const { allRestricted } = await PathConstraintService.getRestrictedNodes(amrId);
    return { restrictedNodes: allRestricted };
  }

  async findPathWithConstraints(pathfindingService, startId, endId, amrId) {
    const constraints = await this.prepareConstraints(amrId);
    return pathfindingService.findPath(startId, endId, constraints);
  }
}

module.exports = new PathfindingOrchestrator();
