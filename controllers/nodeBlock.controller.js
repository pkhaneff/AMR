const NodeBlockService = require('../modules/AMR/services/NodeBlockService');

class NodeBlockController {
  async getBlockedNodes(req, res) {
    try {
      const nodes = await NodeBlockService.getBlockedNodesWithInfo();

      return res.status(200).json({
        success: true,
        data: nodes,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async blockNode(req, res) {
    try {
      const { nodeId, amrId, reason } = req.body;

      if (!nodeId || !amrId) {
        return res.status(400).json({
          success: false,
          message: 'nodeId and amrId are required',
        });
      }

      const result = await NodeBlockService.addBlockedNode(nodeId, amrId, reason);

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

  async unblockNode(req, res) {
    try {
      const { nodeId } = req.body;

      if (!nodeId) {
        return res.status(400).json({
          success: false,
          message: 'nodeId is required',
        });
      }

      const result = await NodeBlockService.removeBlockedNode(nodeId);

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

  async clearBlockedNodesByAMR(req, res) {
    try {
      const { amrId } = req.params;

      if (!amrId) {
        return res.status(400).json({
          success: false,
          message: 'amrId is required',
        });
      }

      const result = await NodeBlockService.clearBlockedNodesByAMR(amrId);

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

module.exports = new NodeBlockController();
