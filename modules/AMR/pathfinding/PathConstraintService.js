const NodeBlockService = require('../services/NodeBlockService');
const AMRStateManager = require('../state/AMRStateManager');
const AMRLogger = require('../utils/AMRLogger');

class PathConstraintService {
  /**
   * Lấy danh sách các node bị block
   * @returns {Array<string>} - Mảng các nodeId bị block
   */
  async getBlockedNodes() {
    try {
      return await NodeBlockService.getBlockedNodes();
    } catch (error) {
      AMRLogger.error('PathConstraint', 'Failed to get blocked nodes', error);
      return [];
    }
  }

  /**
   * Lấy danh sách các node đang có AMR khác đứng
   * @param {string} excludeAmrId - AMR ID cần loại trừ (AMR hiện tại)
   * @returns {Array<string>} - Mảng các nodeId đang bị chiếm
   */
  async getOccupiedNodes(excludeAmrId = null) {
    try {
      const allStates = await AMRStateManager.getAllStates();
      const occupiedNodes = [];

      for (const state of allStates) {
        // Bỏ qua AMR hiện tại
        if (excludeAmrId && state.amrId === excludeAmrId) {
          continue;
        }

        // Chỉ lấy node của các AMR đang hoạt động (không IDLE)
        if (state.currentNode && state.status !== 'IDLE') {
          occupiedNodes.push(state.currentNode);
        }
      }

      return occupiedNodes;
    } catch (error) {
      AMRLogger.error('PathConstraint', 'Failed to get occupied nodes', error);
      return [];
    }
  }

  /**
   * Lấy tất cả các node mà AMR có cargo không được đi qua
   * @param {string} amrId - ID của AMR
   * @returns {Object} - Object chứa blockedNodes và occupiedNodes
   */
  async getRestrictedNodes(amrId) {
    try {
      const [blockedNodes, occupiedNodes] = await Promise.all([this.getBlockedNodes(), this.getOccupiedNodes(amrId)]);

      return {
        blockedNodes,
        occupiedNodes,
        allRestricted: [...new Set([...blockedNodes, ...occupiedNodes])],
      };
    } catch (error) {
      AMRLogger.error('PathConstraint', 'Failed to get restricted nodes', error);
      return {
        blockedNodes: [],
        occupiedNodes: [],
        allRestricted: [],
      };
    }
  }

  /**
   * Kiểm tra AMR có thể đi qua node này không
   * @param {string} nodeId - ID của node cần kiểm tra
   * @param {boolean} hasCargo - AMR có đang mang hàng không
   * @param {Array<string>} restrictedNodes - Danh sách các node bị hạn chế
   * @returns {boolean} - true nếu có thể đi qua
   */
  canPassThrough(nodeId, hasCargo, restrictedNodes = []) {
    try {
      // Nếu không mang hàng, có thể đi qua tất cả các node
      if (!hasCargo) {
        return true;
      }

      // Nếu mang hàng, không được đi qua các node bị hạn chế
      return !restrictedNodes.includes(nodeId);
    } catch (error) {
      AMRLogger.error('PathConstraint', 'Failed to check if can pass through', error);
      return false;
    }
  }

  /**
   * Validate path dựa trên cargo status
   * @param {Array<string>} path - Đường đi cần validate
   * @param {boolean} hasCargo - AMR có đang mang hàng không
   * @param {Array<string>} restrictedNodes - Danh sách các node bị hạn chế
   * @returns {Object} - {valid: boolean, blockedAt: string|null}
   */
  validatePath(path, hasCargo, restrictedNodes = []) {
    try {
      // Nếu không mang hàng, path luôn valid
      if (!hasCargo) {
        return { valid: true, blockedAt: null };
      }

      // Kiểm tra từng node trong path
      for (const nodeId of path) {
        if (restrictedNodes.includes(nodeId)) {
          return {
            valid: false,
            blockedAt: nodeId,
            reason: 'Node is restricted for cargo-carrying AMR',
          };
        }
      }

      return { valid: true, blockedAt: null };
    } catch (error) {
      AMRLogger.error('PathConstraint', 'Failed to validate path', error);
      return {
        valid: false,
        blockedAt: null,
        reason: 'Validation error',
      };
    }
  }

  /**
   * Lọc các neighbor nodes dựa trên constraints
   * @param {Array<Object>} neighbors - Danh sách các neighbor {nodeId, distance}
   * @param {boolean} hasCargo - AMR có đang mang hàng không
   * @param {Array<string>} restrictedNodes - Danh sách các node bị hạn chế
   * @returns {Array<Object>} - Danh sách neighbors đã lọc
   */
  filterNeighbors(neighbors, hasCargo, restrictedNodes = []) {
    try {
      // Nếu không mang hàng, trả về tất cả neighbors
      if (!hasCargo) {
        return neighbors;
      }

      // Lọc bỏ các neighbors bị hạn chế
      return neighbors.filter((neighbor) => !restrictedNodes.includes(neighbor.nodeId));
    } catch (error) {
      AMRLogger.error('PathConstraint', 'Failed to filter neighbors', error);
      return neighbors;
    }
  }

  /**
   * Kiểm tra node có bị chiếm bởi AMR khác không
   * @param {string} nodeId - ID của node
   * @param {string} excludeAmrId - AMR ID cần loại trừ
   * @returns {boolean} - true nếu node bị chiếm
   */
  async isNodeOccupied(nodeId, excludeAmrId = null) {
    try {
      const occupiedNodes = await this.getOccupiedNodes(excludeAmrId);
      return occupiedNodes.includes(nodeId);
    } catch (error) {
      AMRLogger.error('PathConstraint', 'Failed to check if node is occupied', error);
      return false;
    }
  }
}

module.exports = new PathConstraintService();
