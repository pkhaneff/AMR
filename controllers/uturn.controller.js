const UTurnService = require('../modules/AMR/services/UTurnService');
const { manager } = require('../modules/AMR');

class UTurnController {
  async performUTurn(req, res) {
    try {
      const { amrId } = req.params;
      const { currentAngle, taskId } = req.body;

      if (!amrId) {
        return res.status(400).json({
          success: false,
          message: 'amrId is required',
        });
      }

      if (typeof currentAngle !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'currentAngle must be a number',
        });
      }

      const amr = manager.getAMR(amrId);
      if (!amr) {
        return res.status(404).json({
          success: false,
          message: `AMR ${amrId} not found`,
        });
      }

      const result = await UTurnService.performUTurn(amr, currentAngle, taskId);

      return res.status(200).json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async canUTurn(req, res) {
    try {
      const { amrId } = req.params;
      const { currentNode, path, currentIndex } = req.body;

      if (!amrId || !currentNode) {
        return res.status(400).json({
          success: false,
          message: 'amrId and currentNode are required',
        });
      }

      const result = await UTurnService.canUTurn(amrId, currentNode, path, currentIndex);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new UTurnController();
