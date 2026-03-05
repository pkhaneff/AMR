const AMRLogger = require('../../utils/AMRLogger');

class GraphValidator {
  validate(nodes, connections) {
    const errors = [];
    const warnings = [];

    this.checkIsolatedNodes(nodes, connections, warnings);
    this.checkDuplicatePositions(nodes, warnings);
    this.validateConnectionReferences(nodes, connections, errors);

    const stats = this.calculateStats(connections);

    const valid = errors.length === 0;

    if (valid) {
      AMRLogger.info('GraphValidator', 'Graph validation passed', stats);
    } else {
      AMRLogger.error('GraphValidator', `Validation failed: ${errors.length} errors`);
    }

    if (warnings.length > 0) {
      warnings.forEach((warning) => AMRLogger.warn('GraphValidator', warning));
    }

    return { valid, errors, warnings, stats };
  }

  checkIsolatedNodes(nodes, connections, warnings) {
    Object.keys(nodes).forEach((nodeId) => {
      if (!connections[nodeId] || connections[nodeId].length === 0) {
        warnings.push(`Isolated node: ${nodeId}`);
      }
    });
  }

  checkDuplicatePositions(nodes, warnings) {
    const positionMap = new Map();

    Object.values(nodes).forEach((node) => {
      const key = `${node.x},${node.y}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, []);
      }
      positionMap.get(key).push(node.id);
    });

    positionMap.forEach((nodeIds, position) => {
      if (nodeIds.length > 1) {
        warnings.push(`Duplicate position ${position}: ${nodeIds.join(', ')}`);
      }
    });
  }

  validateConnectionReferences(nodes, connections, errors) {
    Object.entries(connections).forEach(([from, toList]) => {
      if (!nodes[from]) {
        errors.push(`Connection references unknown node: ${from}`);
      }

      toList.forEach((to) => {
        if (!nodes[to]) {
          errors.push(`Connection ${from} -> ${to}: target node not found`);
        }
      });
    });
  }

  calculateStats(connections) {
    const degrees = Object.values(connections).map((list) => list.length);
    const totalDegree = degrees.reduce((sum, d) => sum + d, 0);

    return {
      nodeCount: Object.keys(connections).length,
      totalEdges: totalDegree,
      avgDegree: degrees.length > 0 ? (totalDegree / degrees.length).toFixed(2) : 0,
      maxDegree: degrees.length > 0 ? Math.max(...degrees) : 0,
    };
  }
}

module.exports = GraphValidator;
