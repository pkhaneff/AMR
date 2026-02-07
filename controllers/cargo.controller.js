const AMRStateManager = require('../modules/AMR/state/AMRStateManager');

class CargoController {
  async getCargoStatus(req, res) {
    try {
      const { amrId } = req.params;

      if (!amrId) {
        return res.status(400).json({
          success: false,
          message: 'amrId is required',
        });
      }

      const hasCargo = await AMRStateManager.getCargoStatus(amrId);

      return res.status(200).json({
        success: true,
        data: {
          amrId,
          hasCargo,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async setCargoStatus(req, res) {
    try {
      const { amrId } = req.params;
      const { hasCargo } = req.body;

      if (!amrId) {
        return res.status(400).json({
          success: false,
          message: 'amrId is required',
        });
      }

      if (typeof hasCargo !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'hasCargo must be a boolean',
        });
      }

      const result = await AMRStateManager.setCargoStatus(amrId, hasCargo);

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

module.exports = new CargoController();
