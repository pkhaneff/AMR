const fs = require('fs');
const path = require('path');
const AMRLogger = require('../utils/AMRLogger');
const SmapJsonParser = require('./parsers/SmapJsonParser');
const NodeExtractor = require('./extractors/NodeExtractor');
const EdgeExtractor = require('./extractors/EdgeExtractor');
const NodeReferenceValidator = require('./validators/NodeReferenceValidator');
const ConnectionBuilder = require('./builders/ConnectionBuilder');
const GraphValidator = require('./validators/GraphValidator');
const ConfigFormatter = require('./builders/ConfigFormatter');

class MapConverterService {
  constructor() {
    this.parser = new SmapJsonParser();
    this.nodeExtractor = new NodeExtractor();
    this.edgeExtractor = new EdgeExtractor();
    this.nodeRefValidator = new NodeReferenceValidator();
    this.connectionBuilder = new ConnectionBuilder();
    this.graphValidator = new GraphValidator();
    this.formatter = new ConfigFormatter();
  }

  async convert(smapPath, outputPath, options = {}) {
    const { validate = true, backup = true } = options;

    try {
      AMRLogger.info('MapConverter', `Starting conversion: ${smapPath}`);

      const parsedData = this.parser.parse(smapPath);

      const nodesMap = this.nodeExtractor.extract(parsedData.advancedPointList);
      const edges = this.edgeExtractor.extract(parsedData.advancedCurveList);

      const refValidation = this.nodeRefValidator.validate(nodesMap, edges);
      if (!refValidation.valid) {
        throw new Error('Node reference validation failed');
      }

      const connections = this.connectionBuilder.build(edges);

      const nodes = Object.fromEntries(nodesMap);

      if (validate) {
        const graphValidation = this.graphValidator.validate(nodes, connections);
        if (!graphValidation.valid) {
          throw new Error('Graph validation failed');
        }
      }

      if (backup) {
        this.backupExistingFile(outputPath);
      }

      const outputCode = this.formatter.format(nodes, connections);

      fs.writeFileSync(outputPath, outputCode, 'utf-8');

      const stats = {
        nodes: Object.keys(nodes).length,
        connections: Object.keys(connections).length,
        edges: edges.length,
      };

      AMRLogger.info('MapConverter', `Conversion complete: ${outputPath}`, stats);

      return { success: true, stats };
    } catch (error) {
      AMRLogger.error('MapConverter', 'Conversion failed', error);
      throw error;
    }
  }

  backupExistingFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const timestamp = Date.now();
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    const dirname = path.dirname(filePath);
    const backupPath = path.join(dirname, `${basename}.backup.${timestamp}${ext}`);

    fs.copyFileSync(filePath, backupPath);
    AMRLogger.info('MapConverter', `Backup created: ${backupPath}`);
  }
}

module.exports = MapConverterService;
