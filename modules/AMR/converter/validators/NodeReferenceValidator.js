const AMRLogger = require('../../utils/AMRLogger');

class NodeReferenceValidator {
  validate(nodesMap, edges) {
    const errors = [];

    edges.forEach(({ from, to, edgeName }) => {
      if (!nodesMap.has(from)) {
        errors.push(`Edge ${edgeName}: source node '${from}' not found`);
      }

      if (!nodesMap.has(to)) {
        errors.push(`Edge ${edgeName}: target node '${to}' not found`);
      }
    });

    const valid = errors.length === 0;

    if (valid) {
      AMRLogger.info('NodeRefValidator', 'All edge references valid');
    } else {
      AMRLogger.error('NodeRefValidator', `Found ${errors.length} invalid references`);
      errors.forEach((error) => AMRLogger.error('NodeRefValidator', error));
    }

    return { valid, errors };
  }
}

module.exports = NodeReferenceValidator;
