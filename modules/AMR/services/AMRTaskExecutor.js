const PathReservationService = require('../reservation/PathReservationService');
const AMRStateManager = require('../state/AMRStateManager');

class AMRTaskExecutor {
  constructor(eventHandler) {
    this.eventHandler = eventHandler;
  }

  async execute(amr, taskData) {
    const { taskId, amrId, path, move_task_list } = taskData;

    try {
      this._emitInitialEvents(taskId, amrId, move_task_list);

      const reservation = await PathReservationService.reservePath(amrId, path, taskId);
      if (!reservation.success) {
        return this._handleReservationFailure(taskId, amrId, reservation);
      }

      await AMRStateManager.setReservedPath(amrId, path);
      await amr.apiClient.goToTargetList(move_task_list);

      await this._processMovement(taskId, amrId, move_task_list);
      await AMRStateManager.clearCurrentTask(amrId);

      this.eventHandler?.emitCompleted({ taskId, amrId, totalSteps: move_task_list.length });
    } catch (error) {
      this._handleError(taskId, amrId, error);
    }
  }

  _emitInitialEvents(taskId, amrId, moveTaskList) {
    this.eventHandler?.emitQueued({ taskId, amrId, totalSteps: moveTaskList.length });
    this.eventHandler?.emitAssigned({ taskId, amrId, pathLength: moveTaskList.length });
    this.eventHandler?.emitStarted({ taskId, amrId, totalSteps: moveTaskList.length });
  }

  async _processMovement(taskId, amrId, moveTaskList) {
    for (let i = 0; i < moveTaskList.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const step = moveTaskList[i];

      if (step.source_id) {
        await PathReservationService.releaseNode(step.source_id, amrId);
      }

      this.eventHandler?.emitProgress({
        taskId,
        amrId,
        currentStep: i + 1,
        totalSteps: moveTaskList.length,
        currentNode: step.id,
        sourceNode: step.source_id,
        operation: step.operation || null,
      });
    }
  }

  _handleReservationFailure(taskId, amrId, reservation) {
    if (reservation.error) {
      console.error(`[AMRTaskExecutor] Reservation error for ${amrId}: ${reservation.error}`);
      this.eventHandler?.emitFailed({
        taskId,
        amrId,
        error: `Reservation failed: ${reservation.error}`,
      });
      return { success: false, error: reservation.error };
    }

    console.error(
      `[AMRTaskExecutor] Reservation blocked for ${amrId} at ${reservation.blockedNode} by ${reservation.blockedBy}`,
    );
    this.eventHandler?.emitFailed({
      taskId,
      amrId,
      error: `Path blocked at node ${reservation.blockedNode} by ${reservation.blockedBy}`,
    });
    return { success: false, error: 'PATH_BLOCKED' };
  }

  _handleError(taskId, amrId, error) {
    console.error(`[AMRTaskExecutor] Task ${taskId} failed:`, error.message);
    this.eventHandler?.emitFailed({ taskId, amrId, error: error.message });
  }
}

module.exports = AMRTaskExecutor;
