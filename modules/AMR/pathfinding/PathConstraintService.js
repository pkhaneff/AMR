const UnifiedBlockStore = require('../storage/UnifiedBlockStore');

class PathConstraintService {
  async getRestrictedNodes(amrId, hasCargo) {
    if (!hasCargo) {
      return await UnifiedBlockStore.getPositionNodes(amrId);
    }

    const [cargoNodes, positionNodes] = await Promise.all([
      UnifiedBlockStore.getCargoNodes(),
      UnifiedBlockStore.getPositionNodes(amrId)
    ]);

    return [...new Set([...cargoNodes, ...positionNodes])];
  }
}

module.exports = new PathConstraintService();
