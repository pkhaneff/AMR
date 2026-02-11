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

class AMRCoordinator {
  constructor(amrManager, graph) {
    this.amrManager = amrManager;
    this.graph = graph;
    this.pathfinder = new PathfindingService(graph);
    this.reservations = SimpleReservationStore;
    this.blocks = UnifiedBlockStore;
    this.deadlock = DeadlockDetector;
    this.checkInterval = 2000;
  }

  async executeTask(amrId, startNode, endNode, operations = {}) {
    AMRLogger.info('Coordinator', `Task started: ${amrId} from ${startNode} to ${endNode}`);

    try {
      const state = await AMRStateManager.getState(amrId);
      let currentNode = state?.currentNode || state?.coordinates?.current_node;

      // CRITICAL: Nếu không có currentNode, giả định AMR đang ở startNode
      if (!currentNode) {
        AMRLogger.warn('Coordinator', `${amrId} has no currentNode, assuming at startNode: ${startNode}`);
        currentNode = startNode;
        await AMRStateManager.updateCoordinates(amrId, { current_node: startNode });
      }

      // Step 1: Di chuyển đến startNode nếu chưa ở đó
      if (currentNode !== startNode) {
        AMRLogger.info('Coordinator', `${amrId} not at start, moving ${currentNode} → ${startNode}`);
        await this.moveToNode(amrId, currentNode, startNode);
      }

      // Step 2: Trigger startOperation tại startNode
      const startOperation = operations[startNode];
      if (startOperation) {
        AMRLogger.info('Coordinator', `${amrId} triggering start operation ${startOperation} at ${startNode}`);
        await OperationTrigger.triggerIfExists({ id: startNode, operation: startOperation }, amrId);
      }

      // Step 3: Tìm path từ startNode → endNode
      const updatedState = await AMRStateManager.getState(amrId);
      const updatedHasCargo = updatedState?.hasCargo || false;

      const restrictedNodes = await PathConstraintService.getRestrictedNodes(amrId, updatedHasCargo);
      let path = this.pathfinder.findPath(startNode, endNode, { restrictedNodes });

      if (!path || path.length === 0) {
        AMRLogger.warn('Coordinator', `No path found for ${amrId}, trying U-Turn`);

        const uTurn = UTurnStrategy.shouldUTurn(
          this.graph,
          startNode,
          endNode,
          updatedState?.coordinates?.angle || 0
        );

        if (uTurn && uTurn.shouldUTurn) {
          path = UTurnStrategy.createUTurnPath(startNode, endNode);
          AMRLogger.info('Coordinator', `U-Turn path created for ${amrId}`);
        } else {
          throw new Error(`No path found from ${startNode} to ${endNode}`);
        }
      }

      AMRLogger.info('Coordinator', `Path found for ${amrId}: ${path.join(' → ')}`);
      await AMRStateManager.setStatus(amrId, 'MOVING');

      let currentIndex = 0;

      while (currentIndex < path.length - 1) {
        const currentNode = path[currentIndex];
        const nextNode = path[currentIndex + 1];

        AMRLogger.debug('Coordinator', `${amrId} trying to move ${currentNode} → ${nextNode}`);

        const moveResult = await this.tryMoveNext(amrId, currentNode, nextNode);

        if (moveResult.success) {
          if (currentIndex > 0) {
            const prevNode = path[currentIndex - 1];
            await this.reservations.releaseNode(prevNode, amrId);
            await this.blocks.unblockPosition(prevNode);
            AMRLogger.debug('Coordinator', `${amrId} released ${prevNode}`);
          }

          await this.blocks.blockPosition(nextNode, amrId);
          await AMRStateManager.updateCoordinates(amrId, { current_node: nextNode });

          const operation = operations[nextNode];
          if (operation) {
            AMRLogger.info('Coordinator', `${amrId} triggering operation ${operation} at ${nextNode}`);
            await OperationTrigger.triggerIfExists({ id: nextNode, operation }, amrId);
          }

          await AMRStateManager.incrementSteps(amrId);
          await this.recheckOtherAMR(amrId);

          currentIndex++;

        } else if (moveResult.blocked) {
          AMRLogger.warn('Coordinator', `${amrId} blocked at ${currentNode}, waiting...`);
          await AMRStateManager.setStatus(amrId, 'WAITING');

          await this.sleep(this.checkInterval);

          const deadlockInfo = await this.deadlock.detectDeadlock();
          if (deadlockInfo && deadlockInfo.victim === amrId) {
            AMRLogger.warn('Coordinator', `${amrId} is victim, retreating...`);
            await this.handleRetreat(amrId, path, currentIndex);
            return await this.executeTask(amrId, startNode, endNode, operations);
          }

          await AMRStateManager.setStatus(amrId, 'MOVING');
        }
      }

      AMRLogger.info('Coordinator', `${amrId} completed task at ${endNode}`);
      await AMRStateManager.setStatus(amrId, 'IDLE');
      await this.reservations.clearAllByAMR(amrId);

      return { success: true, path };

    } catch (error) {
      AMRLogger.error('Coordinator', `Task failed for ${amrId}`, error);
      await AMRStateManager.setStatus(amrId, 'ERROR');
      await this.reservations.clearAllByAMR(amrId);
      throw error;
    }
  }

  async moveToNode(amrId, fromNode, toNode) {
    const state = await AMRStateManager.getState(amrId);
    const hasCargo = state?.hasCargo || false;
    const restrictedNodes = await PathConstraintService.getRestrictedNodes(amrId, hasCargo);

    const path = this.pathfinder.findPath(fromNode, toNode, { restrictedNodes });
    if (!path || path.length === 0) {
      throw new Error(`Cannot find path from ${fromNode} to ${toNode}`);
    }

    AMRLogger.info('Coordinator', `${amrId} moving to start: ${path.join(' → ')}`);

    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];

      const moveResult = await this.tryMoveNext(amrId, current, next);
      if (!moveResult.success) {
        throw new Error(`Failed to move ${amrId} from ${current} to ${next}`);
      }

      if (i > 0) {
        const prev = path[i - 1];
        await this.reservations.releaseNode(prev, amrId);
        await this.blocks.unblockPosition(prev);
      }

      await this.blocks.blockPosition(next, amrId);
      await AMRStateManager.updateCoordinates(amrId, { current_node: next });
    }

    AMRLogger.info('Coordinator', `${amrId} arrived at ${toNode}`);
  }

  async tryMoveNext(amrId, currentNode, nextNode) {
    const result = await this.reservations.tryReserveNode(nextNode, amrId);

    if (!result.success) {
      AMRLogger.debug('Coordinator', `${amrId} cannot reserve ${nextNode}, owner: ${result.owner}`);
      return { success: false, blocked: true, owner: result.owner };
    }

    const amr = this.amrManager.getAMR(amrId);
    try {
      AMRSocketEmitter.emitMoving({ amrId, from: currentNode, to: nextNode });
      await amr.apiClient.goToTarget({ id: nextNode });

      // Đợi simulator hoàn thành di chuyển (3s)
      await this.sleep(3000);

      AMRSocketEmitter.emitArrived({ amrId, nodeId: nextNode });
      AMRLogger.debug('Coordinator', `${amrId} arrived at ${nextNode}`);
      return { success: true };
    } catch (error) {
      await this.reservations.releaseNode(nextNode, amrId);
      throw error;
    }
  }

  async recheckOtherAMR(currentAmrId) {
    const states = await AMRStateManager.getAllStates();
    const otherState = states.find(s => s.amrId !== currentAmrId);

    if (otherState && otherState.status === 'WAITING') {
      AMRLogger.debug('Coordinator', `Rechecking ${otherState.amrId} (was WAITING)`);
      await AMRStateManager.setStatus(otherState.amrId, 'MOVING');
    }
  }

  async handleRetreat(amrId, originalPath, currentIndex) {
    AMRLogger.warn('Coordinator', `${amrId} retreating from deadlock`);

    const currentNode = originalPath[currentIndex];
    const bayNode = this.findNearestBay(currentNode);

    if (bayNode) {
      await this.moveToRetreat(amrId, currentNode, bayNode);
      AMRLogger.info('Coordinator', `${amrId} waiting at bay ${bayNode} for 5s`);
      await this.sleep(5000);
    } else {
      AMRLogger.warn('Coordinator', `${amrId} no bay found, waiting longer`);
      await this.sleep(10000);
    }
  }

  async moveToRetreat(amrId, fromNode, bayNode) {
    const amr = this.amrManager.getAMR(amrId);
    await amr.apiClient.goToTarget({ id: bayNode });
    await this.blocks.blockPosition(bayNode, amrId);
    AMRLogger.info('Coordinator', `${amrId} moved to bay ${bayNode}`);
  }

  findNearestBay(fromNode) {
    const node = this.graph.getNode(fromNode);
    if (!node) return null;

    for (const neighborId of node.neighbors) {
      const neighbor = this.graph.getNode(neighborId);
      if (neighbor && neighbor.isBay) {
        return neighborId;
      }
    }

    for (const neighborId of node.neighbors) {
      const neighbor = this.graph.getNode(neighborId);
      if (neighbor && neighbor.neighbors.length >= 2) {
        return neighborId;
      }
    }

    return null;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AMRCoordinator;
