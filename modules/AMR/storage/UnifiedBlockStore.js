const RedisStorage = require('./RedisStorage');

class UnifiedBlockStore {
  constructor() {
    this.cargoSetKey = 'blocks:cargo';
    this.positionPrefix = 'blocks:position:';
  }

  async blockCargo(nodeId) {
    await RedisStorage.sAdd(this.cargoSetKey, nodeId);
  }

  async unblockCargo(nodeId) {
    await RedisStorage.sRem(this.cargoSetKey, nodeId);
  }

  async getCargoNodes() {
    return await RedisStorage.sMembers(this.cargoSetKey);
  }

  async isCargoBlocked(nodeId) {
    return await RedisStorage.sIsMember(this.cargoSetKey, nodeId);
  }

  async blockPosition(nodeId, amrId) {
    await RedisStorage.set(`${this.positionPrefix}${nodeId}`, amrId);
  }

  async unblockPosition(nodeId) {
    await RedisStorage.del(`${this.positionPrefix}${nodeId}`);
  }

  async getPositionNodes(excludeAmrId = null) {
    const keys = await RedisStorage.keys(`${this.positionPrefix}*`);
    const nodes = [];

    for (const key of keys) {
      const amrId = await RedisStorage.getRaw(key);
      if (amrId !== excludeAmrId) {
        nodes.push(key.replace(this.positionPrefix, ''));
      }
    }

    return nodes;
  }

  async clearAllByAMR(amrId) {
    const keys = await RedisStorage.keys(`${this.positionPrefix}*`);

    for (const key of keys) {
      const owner = await RedisStorage.getRaw(key);
      if (owner === amrId) {
        await RedisStorage.del(key);
      }
    }
  }
}

module.exports = new UnifiedBlockStore();
