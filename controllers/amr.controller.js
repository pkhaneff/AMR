const amrService = require('../modules/AMR/services/amr.service');
const { manager } = require('../modules/AMR');

class AMRController {
  async generatePath(req, res) {
    try {
      const { start, end, action, amr_id } = req.body;

      if (!start || !end) {
        return res.status(400).json({
          success: false,
          message: 'Start and end nodes are required',
        });
      }

      if (!amr_id) {
        return res.status(400).json({
          success: false,
          message: 'AMR ID (amr_id) is required',
        });
      }

      const validation = await amrService.validateAndPreparePath(start, end, action, amr_id);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      const taskId = `amr_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.status(200).json({
        success: true,
        message: 'Task queued successfully',
        data: {
          taskId,
          move_task_list: validation.move_task_list,
          status: 'queued',
          amrId: amr_id,
          start,
          end,
          action,
        },
      });

      const taskData = {
        taskId,
        amrId: amr_id,
        start,
        end,
        action,
        path: validation.path,
        move_task_list: validation.move_task_list,
      };

      manager.executeTaskAsync(taskData).catch((error) => {
        console.error(`[AMRController] Background task execution failed for ${taskId}:`, error);
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
