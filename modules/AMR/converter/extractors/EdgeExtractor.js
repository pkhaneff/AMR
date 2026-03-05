const AMRLogger = require('../../utils/AMRLogger');

class EdgeExtractor {
  extract(advancedCurveList) {
    const edges = [];

    advancedCurveList.forEach((curve) => {
      if (!this.isDegenerateBezier(curve)) {
        return;
      }

      const edge = this.parseEdge(curve);
      if (edge) {
        edges.push(edge);
      }
    });

    AMRLogger.info('EdgeExtractor', `Extracted ${edges.length} edges`);

    return edges;
  }

  isDegenerateBezier(curve) {
    return curve.className === 'DegenerateBezier';
  }

  parseEdge(curve) {
    const { instanceName, startPos, endPos } = curve;

    if (!instanceName || !startPos || !endPos) {
      return null;
    }

    const fromNode = startPos.instanceName;
    const toNode = endPos.instanceName;

    if (!fromNode || !toNode) {
      return null;
    }

    if (!this.isValidEdgeName(instanceName, fromNode, toNode)) {
      AMRLogger.warn('EdgeExtractor', `Invalid edge: ${instanceName}`);
      return null;
    }

    return {
      from: fromNode,
      to: toNode,
      edgeName: instanceName,
    };
  }

  isValidEdgeName(edgeName, fromNode, toNode) {
    const expectedName = `${fromNode}-${toNode}`;
    return edgeName === expectedName;
  }
}

module.exports = EdgeExtractor;
