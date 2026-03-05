const fs = require('fs');
const AMRLogger = require('../../utils/AMRLogger');

class SmapJsonParser {
  parse(filePath) {
    try {
      AMRLogger.info('SmapParser', `Reading file: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      this.validateStructure(data);

      AMRLogger.info('SmapParser', `Parsed successfully`);

      return {
        header: data.header,
        advancedPointList: data.advancedPointList || [],
        advancedCurveList: data.advancedCurveList || [],
      };
    } catch (error) {
      AMRLogger.error('SmapParser', `Parse failed: ${filePath}`, error);
      throw error;
    }
  }

  validateStructure(data) {
    if (!data.header) {
      throw new Error('Missing header in .smap file');
    }

    if (!data.advancedPointList && !data.advancedCurveList) {
      throw new Error('Missing both advancedPointList and advancedCurveList');
    }
  }
}

module.exports = SmapJsonParser;
