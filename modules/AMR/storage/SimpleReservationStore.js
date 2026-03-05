const RedisStorage = require('./RedisStorage');
const NodeReleaseEventBus = require('../events/NodeReleaseEventBus');

class SimpleReservationStore {
  constructor() {
    this.nodePrefix = 'reserve:node:';
    this.edgePrefix = 'reserve:edge:';
  }

  async tryReserveNode(nodeId, amrId) {
    const key = `${this.nodePrefix}${nodeId}`;

    const script = `
      if redis.call("GET", KEYS[1]) == false or redis.call("GET", KEYS[1]) == ARGV[1] then
        redis.call("SET", KEYS[1], ARGV[1])
        return 1
      else
        return 0
      end
    `;

    const result = await RedisStorage.eval(script, 1, key, amrId);

    if (result === 1) {
      return { success: true };
    } else {
      const owner = await RedisStorage.getRaw(key);
      return { success: false, owner };
    }
  }

  async releaseNode(nodeId, amrId) {
    const key = `${this.nodePrefix}${nodeId}`;
    const owner = await RedisStorage.getRaw(key);

    if (owner === amrId) {
      await RedisStorage.del(key);

      // Emit event NGAY LẬP TỨC khi release node
      NodeReleaseEventBus.notifyNodeReleased(nodeId, amrId);
    }
  }

  async getOwner(nodeId) {
    return await RedisStorage.getRaw(`${this.nodePrefix}${nodeId}`);
  }

  async clearAllByAMR(amrId) {
    const keys = await RedisStorage.keys(`${this.nodePrefix}*`);

    for (const key of keys) {
      const owner = await RedisStorage.getRaw(key);
      if (owner === amrId) {
        await RedisStorage.del(key);

        // Emit event cho mỗi node được release
        const nodeId = key.replace(this.nodePrefix, '');
        NodeReleaseEventBus.notifyNodeReleased(nodeId, amrId);
      }
    }
  }
}

module.exports = new SimpleReservationStore();
