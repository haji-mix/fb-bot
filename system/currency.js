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
      allowClear: false,
    });
    this.defaultBalance = defaultBalance;
  }

  async init() {
    await this.store.start();
  }

  async getBalance(userId) {
    const data = await this.store.get(userId);
    if (data === null) {
      const defaultData = { balance: this.defaultBalance, name: null };
      await this.store.put(userId, defaultData);
      return defaultData.balance;
    }
    // Handle legacy entries (just a number)
    return typeof data === 'object' ? data.balance : data;
  }

  async setName(userId, name) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Name must be a non-empty string');
    }
    const data = await this.store.get(userId);
    let newData;
    if (data === null) {
      newData = { balance: this.defaultBalance, name: name.trim() };
    } else if (typeof data === 'object') {
      newData = { ...data, name: name.trim() };
    } else {
      // Handle legacy number-only entries
      newData = { balance: data, name: name.trim() };
    }
    await this.store.put(userId, newData);
    return newData;
  }

  async addBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const data = await this.store.get(userId);
    let newData;
    if (data === null) {
      newData = { balance: this.defaultBalance + amount, name: null };
    } else if (typeof data === 'object') {
      newData = { ...data, balance: data.balance + amount };
    } else {
      // Handle legacy number-only entries
      newData = { balance: data + amount, name: null };
    }
    await this.store.put(userId, newData);
    return newData.balance;
  }

  async removeBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const data = await this.store.get(userId);
    let currentBalance = this.defaultBalance;
    let name = null;
    if (data !== null) {
      currentBalance = typeof data === 'object' ? data.balance : data;
      name = typeof data === 'object' ? data.name : null;
    }
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }
    const newBalance = currentBalance - amount;
    const newData = { balance: newBalance, name };
    await this.store.put(userId, newData);
    return newBalance;
  }

  async transferBalance(fromUserId, toUserId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const fromData = await this.store.get(fromUserId);
    const toData = await this.store.get(toUserId);

    let fromBalance = this.defaultBalance;
    let fromName = null;
    let toBalance = this.defaultBalance;
    let toName = null;

    if (fromData !== null) {
      fromBalance = typeof fromData === 'object' ? fromData.balance : fromData;
      fromName = typeof fromData === 'object' ? fromData.name : null;
    }
    if (toData !== null) {
      toBalance = typeof toData === 'object' ? toData.balance : toData;
      toName = typeof toData === 'object' ? toData.name : null;
    }

    if (fromBalance < amount) {
      throw new Error('Insufficient balance');
    }

    await this.store.bulkPut({
      [fromUserId]: { balance: fromBalance - amount, name: fromName },
      [toUserId]: { balance: toBalance + amount, name: toName },
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

  async close() {
    await this.store.close();
  }
}

module.exports = { CurrencySystem };