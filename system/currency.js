// ni add ko lang mga ano ko sa cmd. but still remains unchanged everything tho


const { createStore } = require("./dbStore");

class CurrencySystem {
  constructor({
    mongoUri = process.env.mongo_uri || global.api.mongo_uri,
    database = 'currency',
    collection = 'balances',
    defaultBalance = 0
  }) {
    this.store = createStore({
      type: "mongodb",
      uri: mongoUri,
      database,
      collection,
      ignoreError: false,
      allowClear: true,
    });
    this.defaultBalance = defaultBalance;
  }

  async init() {
    await this.store.start();
  }

  async forceReset() {
    try {
      await this.store.clear();
      return true;
    } catch (error) {
      throw new Error(`Failed to reset database: ${error.message}`);
    }
  }

  async getData(userId) {
    const data = await this.store.get(userId);
    if (data === null) {
      const defaultData = { balance: this.defaultBalance, name: null, exp: 0, inventory: {} };
      await this.store.put(userId, defaultData);
      return defaultData;
    }
    return typeof data === 'object'
      ? { balance: data.balance || this.defaultBalance, name: data.name || null, exp: data.exp || 0, inventory: data.inventory || {} }
      : { balance: data, name: null, exp: 0, inventory: {} };
  }

  async setData(userId, data) {
    if (!userId || typeof data !== 'object') {
      throw new Error('Invalid user ID or data');
    }
    const currentData = await this.getData(userId);
    const newData = { ...currentData, ...data };
    await this.store.put(userId, newData);
    return newData;
  }

  async getBalance(userId) {
    const data = await this.getData(userId);
    return data.balance;
  }

  async setName(userId, name) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Name must be a non-empty string');
    }
    const data = await this.getData(userId);
    const newData = { ...data, name: name.trim() };
    await this.store.put(userId, newData);
    return newData;
  }

  async addBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const data = await this.getData(userId);
    const newData = { ...data, balance: (data.balance || this.defaultBalance) + amount };
    await this.store.put(userId, newData);
    return newData.balance;
  }

  async increaseMoney(userId, amount) {
    return this.addBalance(userId, amount);
  }

  async increaseExp(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const data = await this.getData(userId);
    const newData = { ...data, exp: (data.exp || 0) + amount };
    await this.store.put(userId, newData);
    return newData.exp;
  }

  async removeBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const data = await this.getData(userId);
    const currentBalance = data.balance || this.defaultBalance;
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }
    const newData = { ...data, balance: currentBalance - amount };
    await this.store.put(userId, newData);
    return newData.balance;
  }

  async transferBalance(fromUserId, toUserId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const fromData = await this.getData(fromUserId);
    const toData = await this.getData(toUserId);
    const fromBalance = fromData.balance || this.defaultBalance;
    const toBalance = toData.balance || this.defaultBalance;
    if (fromBalance < amount) {
      throw new Error('Insufficient balance');
    }
    await this.store.bulkPut({
      [fromUserId]: { ...fromData, balance: fromBalance - amount },
      [toUserId]: { ...toData, balance: toBalance + amount },
    });
    return { fromBalance: fromBalance - amount, toBalance: toBalance + amount };
  }

  async getLeaderboard(limit = 10) {
    const entries = await this.store.entries();
    return entries
      .map(({ key, value }) => ({
        userId: key,
        balance: typeof value === 'object' ? value.balance : value,
        name: typeof value === 'object' ? value.name : null
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  async deleteUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const data = await this.getData(userId);
    if (data === null) {
      throw new Error('User not found');
    }
    await this.store.delete(userId);
    return true;
  }

  async close() {
    await this.store.close();
  }
}

module.exports = { CurrencySystem };
