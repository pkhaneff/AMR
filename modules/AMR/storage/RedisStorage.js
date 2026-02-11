const redis = require('../../../redis/RedisClient');

class RedisStorage {
  constructor() {
    this.client = redis;
  }

  async save(key, data, ttl = null) {
    try {
      const serialized = JSON.stringify(data);
      if (ttl) {
        await this.client.set(key, serialized, { EX: ttl });
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`[RedisStorage] Save error for key ${key}:`, error.message);
      throw error;
    }
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`[RedisStorage] Get error for key ${key}:`, error.message);
      return null;
    }
  }

  async getRaw(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`[RedisStorage] GetRaw error for key ${key}:`, error.message);
      return null;
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`[RedisStorage] Delete error for key ${key}:`, error.message);
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[RedisStorage] Exists error for key ${key}:`, error.message);
      return false;
    }
  }

  // Direct Redis operations (non-JSON)
  async set(key, value, options = null) {
    try {
      if (options) {
        await this.client.set(key, value, options);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error(`[RedisStorage] Set error for key ${key}:`, error.message);
      throw error;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`[RedisStorage] Del error for key ${key}:`, error.message);
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`[RedisStorage] Keys error for pattern ${pattern}:`, error.message);
      return [];
    }
  }

  async eval(script, numKeys, ...args) {
    try {
      // Split args into keys and arguments based on numKeys
      const keys = args.slice(0, numKeys);
      const scriptArgs = args.slice(numKeys);

      return await this.client.eval(script, {
        keys: keys,
        arguments: scriptArgs
      });
    } catch (error) {
      console.error(`[RedisStorage] Eval error:`, error.message);
      throw error;
    }
  }

  // Set operations
  async sAdd(key, member) {
    try {
      await this.client.sAdd(key, member);
    } catch (error) {
      console.error(`[RedisStorage] sAdd error for key ${key}:`, error.message);
      throw error;
    }
  }

  async sRem(key, member) {
    try {
      await this.client.sRem(key, member);
    } catch (error) {
      console.error(`[RedisStorage] sRem error for key ${key}:`, error.message);
    }
  }

  async sMembers(key) {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      console.error(`[RedisStorage] sMembers error for key ${key}:`, error.message);
      return [];
    }
  }

  async sIsMember(key, member) {
    try {
      const result = await this.client.sIsMember(key, member);
      return result === 1;
    } catch (error) {
      console.error(`[RedisStorage] sIsMember error for key ${key}:`, error.message);
      return false;
    }
  }

  disconnect() {
    console.log('[RedisStorage] Disconnecting...');
  }
}

module.exports = new RedisStorage();
