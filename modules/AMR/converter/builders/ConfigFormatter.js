class ConfigFormatter {
  format(nodes, connections) {
    const nodesCode = this.formatNodes(nodes);
    const connectionsCode = this.formatConnections(connections);

    return `module.exports = {
  nodes: ${nodesCode},

  connections: ${connectionsCode},
};
`;
  }

  formatNodes(nodes) {
    const entries = [];
    const sortedNodeIds = Object.keys(nodes).sort();

    sortedNodeIds.forEach((nodeId) => {
      const node = nodes[nodeId];
      entries.push(
        `    ${nodeId}: {\n` +
        `      id: '${node.id}',\n` +
        `      x: ${node.x},\n` +
        `      y: ${node.y},\n` +
        `    }`
      );
    });

    return `{\n${entries.join(',\n')}\n  }`;
  }

  formatConnections(connections) {
    const entries = [];
    const sortedNodeIds = Object.keys(connections).sort();

    sortedNodeIds.forEach((nodeId) => {
      const neighbors = connections[nodeId];
      const formattedNeighbors = JSON.stringify(neighbors);
      entries.push(`    ${nodeId}: ${formattedNeighbors}`);
    });

    return `{\n${entries.join(',\n')}\n  }`;
  }
}

module.exports = ConfigFormatter;
