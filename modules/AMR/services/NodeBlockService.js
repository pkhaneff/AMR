const RedisStorage = require('../storage/RedisStorage');
const AMRLogger = require('../utils/AMRLogger');

class NodeBlockService {
  constructor() {
    this.storage = new RedisStorage();
    this.BLOCK_PREFIX = 'nodeblock:node:';
    this.BLOCK_LIST_KEY = 'nodeblock:list';
  }

  /**
   * Thêm node vào danh sách blocked nodes
   * @param {string} nodeId - ID của node cần block
   * @param {string} amrId - ID của AMR đang thực hiện jackupload
   * @param {string} reason - Lý do block (mặc định: 'jackupload')
   */
  async addBlockedNode(nodeId, amrId, reason = 'jackupload') {
    try {
      const blockData = {
        amrId,
        reason,
        timestamp: Date.now(),
      };

      // Lưu thông tin block vào Redis
      await this.storage.save(`${this.BLOCK_PREFIX}${nodeId}`, blockData);

      // Thêm nodeId vào danh sách blocked nodes (sử dụng Set)
      await this.storage.client.sadd(this.BLOCK_LIST_KEY, nodeId);

      AMRLogger.info('NodeBlock', `Node ${nodeId} blocked by AMR ${amrId}`, blockData);
      return { success: true, nodeId, amrId };
    } catch (error) {
      AMRLogger.error('NodeBlock', `Failed to block node ${nodeId}`, error);
      throw error;
    }
  }

  /**
   * Xóa node khỏi danh sách blocked nodes
   * @param {string} nodeId - ID của node cần unblock
   */
  async removeBlockedNode(nodeId) {
    try {
      // Lấy thông tin block trước khi xóa (để log)
      const blockData = await this.storage.get(`${this.BLOCK_PREFIX}${nodeId}`);

      // Xóa thông tin block
      await this.storage.delete(`${this.BLOCK_PREFIX}${nodeId}`);

      // Xóa nodeId khỏi danh sách blocked nodes
      await this.storage.client.srem(this.BLOCK_LIST_KEY, nodeId);

      AMRLogger.info('NodeBlock', `Node ${nodeId} unblocked`, blockData);
      return { success: true, nodeId, previousBlock: blockData };
    } catch (error) {
      AMRLogger.error('NodeBlock', `Failed to unblock node ${nodeId}`, error);
      throw error;
    }
  }

  /**
   * Kiểm tra node có bị block không
   * @param {string} nodeId - ID của node cần kiểm tra
   * @returns {boolean} - true nếu node bị block
   */
  async isNodeBlocked(nodeId) {
    try {
      const exists = await this.storage.exists(`${this.BLOCK_PREFIX}${nodeId}`);
      return exists;
    } catch (error) {
      AMRLogger.error('NodeBlock', `Failed to check if node ${nodeId} is blocked`, error);
      return false;
    }
  }

  /**
   * Lấy thông tin block của một node
   * @param {string} nodeId - ID của node
   * @returns {object|null} - Thông tin block hoặc null
   */
  async getBlockInfo(nodeId) {
    try {
      return await this.storage.get(`${this.BLOCK_PREFIX}${nodeId}`);
    } catch (error) {
      AMRLogger.error('NodeBlock', `Failed to get block info for node ${nodeId}`, error);
      return null;
    }
  }

  /**
   * Lấy danh sách tất cả blocked nodes
   * @returns {Array} - Mảng các nodeId bị block
   */
  async getBlockedNodes() {
    try {
      const blockedNodeIds = await this.storage.client.smembers(this.BLOCK_LIST_KEY);
      return blockedNodeIds || [];
    } catch (error) {
      AMRLogger.error('NodeBlock', 'Failed to get blocked nodes list', error);
      return [];
    }
  }

  /**
   * Lấy danh sách blocked nodes với thông tin chi tiết
   * @returns {Array} - Mảng các object chứa nodeId và block info
   */
  async getBlockedNodesWithInfo() {
    try {
      const blockedNodeIds = await this.getBlockedNodes();
      const nodesWithInfo = [];

      for (const nodeId of blockedNodeIds) {
        const info = await this.getBlockInfo(nodeId);
        if (info) {
          nodesWithInfo.push({
            nodeId,
            ...info,
          });
        }
      }

      return nodesWithInfo;
    } catch (error) {
      AMRLogger.error('NodeBlock', 'Failed to get blocked nodes with info', error);
      return [];
    }
  }

  /**
   * Xóa tất cả blocked nodes của một AMR cụ thể
   * @param {string} amrId - ID của AMR
   */
  async clearBlockedNodesByAMR(amrId) {
    try {
      const blockedNodes = await this.getBlockedNodesWithInfo();
      const clearedNodes = [];

      for (const node of blockedNodes) {
        if (node.amrId === amrId) {
          await this.removeBlockedNode(node.nodeId);
          clearedNodes.push(node.nodeId);
        }
      }

      AMRLogger.info('NodeBlock', `Cleared ${clearedNodes.length} blocked nodes for AMR ${amrId}`, { clearedNodes });
      return { success: true, clearedNodes };
    } catch (error) {
      AMRLogger.error('NodeBlock', `Failed to clear blocked nodes for AMR ${amrId}`, error);
      throw error;
    }
  }

  /**
   * Xóa tất cả blocked nodes (cleanup)
   */
  async clearAllBlockedNodes() {
    try {
      const blockedNodeIds = await this.getBlockedNodes();

      for (const nodeId of blockedNodeIds) {
        await this.storage.delete(`${this.BLOCK_PREFIX}${nodeId}`);
      }

      await this.storage.client.del(this.BLOCK_LIST_KEY);

      AMRLogger.info('NodeBlock', `Cleared all ${blockedNodeIds.length} blocked nodes`);
      return { success: true, count: blockedNodeIds.length };
    } catch (error) {
      AMRLogger.error('NodeBlock', 'Failed to clear all blocked nodes', error);
      throw error;
    }
  }
}

module.exports = new NodeBlockService();
