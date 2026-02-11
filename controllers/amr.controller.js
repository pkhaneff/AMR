const AMRCoordinator = require('../modules/AMR/coordination/AMRCoordinator');
const { manager: AMRManager } = require('../modules/AMR');
const Graph = require('../modules/AMR/models/Graph');
const nodesConfig = require('../modules/AMR/nodes.config');

const graph = new Graph(nodesConfig);
const coordinator = new AMRCoordinator(AMRManager, graph);

class AMRController {
  async generatePath(req, res) {
    try {
      const { start, end, action, amr_id } = req.body;

      if (!start || !end || !amr_id) {
        return res.status(400).json({
          success: false,
          message: 'start, end, and amr_id are required',
        });
      }

      const operations = {};
      if (action) {
        operations[start] = 'pickup';   // Pickup cargo at start
        operations[end] = 'dropoff';    // Dropoff cargo at end
      }

      res.status(200).json({
        success: true,
        message: 'Task queued successfully',
        data: {
          amrId: amr_id,
          start,
          end,
          operations,
          description: action
            ? `AMR will pickup cargo at ${start} and dropoff at ${end}`
            : `AMR will move from ${start} to ${end}`,
        },
      });

      coordinator.executeTask(amr_id, start, end, operations).catch((error) => {
        console.error(`[AMRController] Task execution failed:`, error);
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new AMRController();
