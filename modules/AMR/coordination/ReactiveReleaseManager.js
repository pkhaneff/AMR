const NodeReleaseEventBus = require('../events/NodeReleaseEventBus');
const SimpleReservationStore = require('../storage/SimpleReservationStore');
const UnifiedBlockStore = require('../storage/UnifiedBlockStore');
const AMRLogger = require('../utils/AMRLogger');

class ReactiveReleaseManager {
  constructor() {
    this.waitingContexts = new Map(); // amrId -> { path, releasedIndex, callback }
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Listen to node release events
    NodeReleaseEventBus.onNodeReleased(async ({ nodeId, releasedBy }) => {
      await this.handleNodeReleased(nodeId, releasedBy);
    });

    AMRLogger.info('ReactiveRelease', 'Event listeners initialized');
  }

  async handleNodeReleased(nodeId, releasedBy) {
    AMRLogger.debug('ReactiveRelease', `Node ${nodeId} released by ${releasedBy}`);

    // Check ALL registered contexts (not just WAITING state)
    // This allows AMRs to react even before they enter WAITING state
    for (const [amrId, context] of this.waitingContexts.entries()) {
      if (amrId === releasedBy) continue;

      await this.tryUpdateRelease(amrId, nodeId);
    }
  }

  async tryUpdateRelease(amrId, freedNodeId) {
    const context = this.waitingContexts.get(amrId);
    if (!context) {
      AMRLogger.debug('ReactiveRelease', `No context for ${amrId}, skipping`);
      return;
    }

    const { path, releasedIndex } = context;

    // Check if freedNodeId is the next node in path
    const nextNodeIndex = releasedIndex + 1;
    if (nextNodeIndex >= path.length) {
      return; // No more nodes to release
    }

    const nextNode = path[nextNodeIndex];
    if (nextNode !== freedNodeId) {
      AMRLogger.debug('ReactiveRelease', `${freedNodeId} not next for ${amrId} (expecting ${nextNode})`);
      return;
    }

    // Try to reserve the freed node
    const reserved = await SimpleReservationStore.tryReserveNode(nextNode, amrId);
    if (!reserved.success) {
      AMRLogger.debug('ReactiveRelease', `Cannot reserve ${nextNode} for ${amrId} (taken by ${reserved.owner})`);
      return;
    }

    // Successfully reserved! Extend window
    await UnifiedBlockStore.blockPosition(nextNode, amrId);
    context.releasedIndex = nextNodeIndex;

    AMRLogger.info('ReactiveRelease', `Extended window for ${amrId}: released ${nextNode}`);

    // Notify callback (coordinator will issue movement command)
    if (context.callback) {
      context.callback({
        nodeId: nextNode,
        newReleasedIndex: nextNodeIndex,
        remainingPath: path.slice(nextNodeIndex)
      });
    }
  }

  registerWaitingAMR(amrId, path, releasedIndex, callback) {
    this.waitingContexts.set(amrId, {
      path,
      releasedIndex,
      callback,
      registeredAt: Date.now()
    });

    AMRLogger.debug('ReactiveRelease', `Registered ${amrId} waiting context`);
  }

  unregisterWaitingAMR(amrId) {
    this.waitingContexts.delete(amrId);
    AMRLogger.debug('ReactiveRelease', `Unregistered ${amrId} waiting context`);
  }

  clearAllContexts() {
    this.waitingContexts.clear();
  }

  getWaitingAMRs() {
    return Array.from(this.waitingContexts.keys());
  }
}

module.exports = new ReactiveReleaseManager();
