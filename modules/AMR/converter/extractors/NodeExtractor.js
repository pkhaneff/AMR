const AMRLogger = require('../../utils/AMRLogger');

class NodeExtractor {
  extract(advancedPointList) {
    const nodesMap = new Map();

    advancedPointList.forEach((point) => {
      const nodeId = point.instanceName;

      if (!nodeId || !point.pos) {
        return;
      }

      if (!this.isValidNodeId(nodeId)) {
        return;
      }

      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          x: point.pos.x,
          y: point.pos.y,
        });
      }
    });

    AMRLogger.info('NodeExtractor', `Extracted ${nodesMap.size} nodes`);

    return nodesMap;
  }

  isValidNodeId(nodeId) {
    return /^(LM|AP)\d+$/.test(nodeId);
  }
}

module.exports = NodeExtractor;
