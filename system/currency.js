const { createStore } = require("./dbStore");

class CurrencySystem {
  constructor({ mongoUri = process.env.mongo_uri || global.api.mongo_uri, database = 'currency', collection = 'balances', defaultBalance = 0 }) {
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
    let balance = await this.store.get(userId);
    if (balance === null) {
      balance = this.defaultBalance;
      await this.store.put(userId, balance);
    }
    return balance;
  }

  async addBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const balance = await this.getBalance(userId);
    const newBalance = balance + amount;
    await this.store.put(userId, newBalance);
    return newBalance;
  }

  async removeBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    const newBalance = balance - amount;
    await this.store.put(userId, newBalance);
    return newBalance;
  }

  async transferBalance(fromUserId, toUserId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    const fromBalance = await this.getBalance(fromUserId);
    if (fromBalance < amount) {
      throw new Error('Insufficient balance');
    }
    const toBalance = await this.getBalance(toUserId);
    await this.store.bulkPut({
      [fromUserId]: fromBalance - amount,
      [toUserId]: toBalance + amount,
    });
    return { fromBalance: fromBalance - amount, toBalance: toBalance + amount };
  }

  async getLeaderboard(limit = 10) {
    const entries = await this.store.entries();
    return entries
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map(({ key, value }) => ({ userId: key, balance: value }));
  }

  async close() {
    await this.store.close();
  }
}

module.exports = { CurrencySystem };