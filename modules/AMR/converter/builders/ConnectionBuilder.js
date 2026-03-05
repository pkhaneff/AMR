const AMRLogger = require('../../utils/AMRLogger');

class ConnectionBuilder {
  build(edges) {
    const adjacencyMap = new Map();

    edges.forEach(({ from, to }) => {
      if (!adjacencyMap.has(from)) {
        adjacencyMap.set(from, new Set());
      }
      adjacencyMap.get(from).add(to);
    });

    const connections = {};
    const sortedNodes = Array.from(adjacencyMap.keys()).sort();

    sortedNodes.forEach((nodeId) => {
      const neighbors = Array.from(adjacencyMap.get(nodeId)).sort();
      connections[nodeId] = neighbors;
    });

    AMRLogger.info('ConnectionBuilder', `Built ${Object.keys(connections).length} connection entries`);

    return connections;
  }

  detectBidirectional(connections) {
    const bidirectional = [];
    const unidirectional = [];

    Object.entries(connections).forEach(([from, toList]) => {
      toList.forEach((to) => {
        const hasReverse = connections[to]?.includes(from);

        if (hasReverse) {
          const pair = [from, to].sort().join('-');
          if (!bidirectional.includes(pair)) {
            bidirectional.push(pair);
          }
        } else {
          unidirectional.push(`${from}->${to}`);
        }
      });
    });

    if (unidirectional.length > 0) {
      AMRLogger.warn('ConnectionBuilder', `Unidirectional edges: ${unidirectional.join(', ')}`);
    }

    return { bidirectional, unidirectional };
  }
}

module.exports = ConnectionBuilder;
