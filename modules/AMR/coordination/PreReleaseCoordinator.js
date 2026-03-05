const PathfindingService = require('../services/pathfinding.service');
const UTurnStrategy = require('../pathfinding/UTurnStrategy');
const PathConstraintService = require('../pathfinding/PathConstraintService');
const SimpleReservationStore = require('../storage/SimpleReservationStore');
const UnifiedBlockStore = require('../storage/UnifiedBlockStore');
const AMRStateManager = require('../state/AMRStateManager');
const DeadlockDetector = require('../conflict/DeadlockDetector');
const OperationTrigger = require('../operation/OperationTrigger');
const AMRSocketEmitter = require('../socket/AMRSocketEmitter');
const AMRLogger = require('../utils/AMRLogger');
const ReactiveReleaseManager = require('./ReactiveReleaseManager');

class PreReleaseCoordinator {
  constructor(amrManager, graph) {
    this.amrManager = amrManager;
    this.graph = graph;
    this.pathfinder = new PathfindingService(graph);
    this.reservations = SimpleReservationStore;
    this.blocks = UnifiedBlockStore;
    this.deadlock = DeadlockDetector;

    // Pre-release config
    this.LOOKAHEAD_WINDOW = 3; // Release trước 4 nodes 
    this.CHECK_INTERVAL = 100; // Check mỗi 100ms thay vì 2000ms
    this.MOVE_DURATION = 2000; // Thời gian di chuyển giữa 2 node
  }

  async executeTask(amrId, startNode, endNode, operations = {}) {
    AMRLogger.info('PreRelease', `Task started: ${amrId} from ${startNode} to ${endNode}`);

    try {
      const state = await AMRStateManager.getState(amrId);
      let currentNode = state?.currentNode || state?.coordinates?.current_node;

      if (!currentNode) {
        AMRLogger.warn('PreRelease', `${amrId} no currentNode, assuming at startNode`);
        currentNode = startNode;
        await AMRStateManager.updateCoordinates(amrId, { current_node: startNode });
      }

      // Move to start if needed
      if (currentNode !== startNode) {
        await this.moveToNode(amrId, currentNode, startNode);
      }

      // Trigger start operation
      const startOperation = operations[startNode];
      if (startOperation) {
        await OperationTrigger.triggerIfExists({ id: startNode, operation: startOperation }, amrId);
      }

      // Find path
      const updatedState = await AMRStateManager.getState(amrId);
      const updatedHasCargo = updatedState?.hasCargo || false;
      const restrictedNodes = await PathConstraintService.getRestrictedNodes(amrId, updatedHasCargo);

      let path = this.pathfinder.findPath(startNode, endNode, { restrictedNodes });

      if (!path || path.length === 0) {
        const uTurn = UTurnStrategy.shouldUTurn(
          this.graph, startNode, endNode, updatedState?.coordinates?.angle || 0
        );
        if (uTurn?.shouldUTurn) {
          path = UTurnStrategy.createUTurnPath(startNode, endNode);
        } else {
          throw new Error(`No path found from ${startNode} to ${endNode}`);
        }
      }

      AMRLogger.info('PreRelease', `Path: ${path.join(' → ')}`);
      await AMRStateManager.setStatus(amrId, 'MOVING');

      // Execute with pre-release
      await this.executePathWithPreRelease(amrId, path, operations);

      AMRLogger.info('PreRelease', `${amrId} completed at ${endNode}`);
      await AMRStateManager.setStatus(amrId, 'IDLE');
      await this.reservations.clearAllByAMR(amrId);

      return { success: true, path };

    } catch (error) {
      AMRLogger.error('PreRelease', `Task failed for ${amrId}`, error);
      await AMRStateManager.setStatus(amrId, 'ERROR');
      await this.reservations.clearAllByAMR(amrId);
      throw error;
    }
  }

  async executePathWithPreRelease(amrId, path, operations) {
    let currentIndex = 0;
    let releasedIndex = 0;
    const amr = this.amrManager.getAMR(amrId);

    // Register EARLY with ReactiveReleaseManager (before trying reservations)
    // This allows AMR to react to releases even during initial reservation phase
    ReactiveReleaseManager.registerWaitingAMR(amrId, path, releasedIndex, async (updateInfo) => {
      const { nodeId, newReleasedIndex } = updateInfo;
      AMRLogger.info('PreRelease', `${amrId} reactive extension: ${nodeId}`);

      releasedIndex = newReleasedIndex;
      const newSegment = path.slice(0, releasedIndex + 1);
      await this.issueContinuousMovement(amr, newSegment, operations);
    });

    // Pre-release initial window
    const initialWindow = Math.min(this.LOOKAHEAD_WINDOW, path.length - 1);
    for (let i = 1; i <= initialWindow; i++) {
      const reserved = await this.tryReserveNode(path[i], amrId);
      if (!reserved) {
        AMRLogger.warn('PreRelease', `Cannot pre-reserve ${path[i]}, window shortened to ${i - 1}`);
        break;
      }
      releasedIndex = i;
      await this.blocks.blockPosition(path[i], amrId);

      // Update context với releasedIndex mới
      const context = ReactiveReleaseManager.waitingContexts.get(amrId);
      if (context) context.releasedIndex = releasedIndex;
    }

    AMRLogger.info('PreRelease', `Pre-released nodes: ${path.slice(1, releasedIndex + 1).join(', ')}`);
    const releasedSegment = path.slice(0, releasedIndex + 1);

    this.issueContinuousMovement(amr, releasedSegment, operations);

    while (currentIndex < path.length - 1) {
      const currentNode = path[currentIndex];
      const nextNode = path[currentIndex + 1];

      AMRLogger.debug('PreRelease', `${amrId} moving ${currentNode} → ${nextNode}`);

      await this.sleep(this.MOVE_DURATION);

      currentIndex++;
      await AMRStateManager.updateCoordinates(amrId, { current_node: nextNode });
      AMRSocketEmitter.emitArrived({ amrId, nodeId: nextNode });

      const operation = operations[nextNode];
      if (operation) {
        await OperationTrigger.triggerIfExists({ id: nextNode, operation }, amrId);
      }

      const releaseThreshold = 2;
      if (currentIndex > releaseThreshold) {
        const oldNode = path[currentIndex - releaseThreshold];
        await this.reservations.releaseNode(oldNode, amrId);
        await this.blocks.unblockPosition(oldNode);
        AMRLogger.debug('PreRelease', `Released ${oldNode} (behind AMR)`);
      }
      
      const horizon = releasedIndex + 1;
      if (horizon < path.length) {
        const nextToRelease = path[horizon];
        const reserved = await this.tryReserveNode(nextToRelease, amrId);

        if (reserved) {
          releasedIndex = horizon;
          await this.blocks.blockPosition(nextToRelease, amrId);
          AMRLogger.debug('PreRelease', `Extended window: released ${nextToRelease}`);

          const newSegment = path.slice(currentIndex, releasedIndex + 1);
          this.issueContinuousMovement(amr, newSegment, operations);

        } else {
          AMRLogger.warn('PreRelease', `Cannot extend window: ${nextToRelease} blocked`);
          await AMRStateManager.setStatus(amrId, 'WAITING');

          await this.waitForClearanceReactive(amrId, path, releasedIndex, amr, operations);

          await AMRStateManager.setStatus(amrId, 'MOVING');
        }
      }
    }
    ReactiveReleaseManager.unregisterWaitingAMR(amrId);
  }

  async issueContinuousMovement(amr, segment, operations) {
    // Send batch movement command to AMR
    // AMR will move continuously through these nodes
    for (let i = 0; i < segment.length - 1; i++) {
      const node = segment[i + 1];
      AMRSocketEmitter.emitMoving({ amrId: amr.id, from: segment[i], to: node });
      await amr.apiClient.goToTarget({ id: node });
    }
  }

  async tryReserveNode(nodeId, amrId) {
    const result = await this.reservations.tryReserveNode(nodeId, amrId);
    return result.success;
  }

  async waitForClearanceReactive(amrId, path, releasedIndex, amr, operations) {
    return new Promise((resolve, reject) => {
      // Register with ReactiveReleaseManager
      ReactiveReleaseManager.registerWaitingAMR(amrId, path, releasedIndex, async (updateInfo) => {
        const { nodeId, newReleasedIndex } = updateInfo;

        AMRLogger.info('PreRelease', `${amrId} awakened: ${nodeId} released`);

        // Update local releasedIndex
        releasedIndex = newReleasedIndex;

        // Issue movement command to newly released node
        const newSegment = path.slice(0, releasedIndex + 1);
        await this.issueContinuousMovement(amr, newSegment, operations);

        // Unregister and resolve
        ReactiveReleaseManager.unregisterWaitingAMR(amrId);
        resolve();
      });

      // Timeout fallback (safety)
      setTimeout(async () => {
        ReactiveReleaseManager.unregisterWaitingAMR(amrId);

        const deadlockInfo = await this.deadlock.detectDeadlock();
        if (deadlockInfo?.victim === amrId) {
          reject(new Error('Deadlock detected'));
        } else {
          reject(new Error('Timeout waiting for clearance'));
        }
      }, 30000); // 30s timeout
    });
  }

  async moveToNode(amrId, fromNode, toNode) {
    const state = await AMRStateManager.getState(amrId);
    const hasCargo = state?.hasCargo || false;
    const restrictedNodes = await PathConstraintService.getRestrictedNodes(amrId, hasCargo);

    const path = this.pathfinder.findPath(fromNode, toNode, { restrictedNodes });
    if (!path || path.length === 0) {
      throw new Error(`Cannot find path from ${fromNode} to ${toNode}`);
    }

    await this.executePathWithPreRelease(amrId, path, {});
  }

  // recheckOtherAMR removed: ReactiveReleaseManager handles via events

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PreReleaseCoordinator;
