class Node {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.neighbors = [];
  }

  addNeighbor(nodeId, distance) {
    this.neighbors.push({ nodeId, distance });
  }

  getDistance(otherNode) {
    const dx = this.x - otherNode.x;
    const dy = this.y - otherNode.y;
    return dx * dx + dy * dy;
  }
}

module.exports = Node;
