const { createStore } = require("./dbStore");

class CurrencySystemError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CurrencySystemError';
    this.code = code || 'UNKNOWN';
  }
}

class CurrencySystem {
  static generateId() {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  constructor({
    mongoUri = process.env.mongo_uri || global.api.mongo_uri,
    database = 'currency',
    userCollection = 'balances',
    itemCollection = 'items',
    defaultBalance = 0,
    useItemCollection = true,
  } = {}) {
    if (!mongoUri) throw new CurrencySystemError('MongoDB URI is required', 'INVALID_MONGO_URI');
    if (typeof defaultBalance !== 'number' || defaultBalance < 0) {
      throw new CurrencySystemError('Default balance must be a non-negative number', 'INVALID_DEFAULT_BALANCE');
    }
    this.userStore = createStore({
      type: "mongodb",
      uri: mongoUri,
      database,
      collection: userCollection,
      ignoreError: false,
      allowClear: true,
    });
    this.useItemCollection = useItemCollection;
    if (useItemCollection) {
      this.itemStore = createStore({
        type: "mongodb",
        uri: mongoUri,
        database,
        collection: itemCollection,
        ignoreError: false,
        allowClear: true,
      });
    }
    this.defaultBalance = defaultBalance;
    this.cache = new Map();
  }

  async init() {
    await this.userStore.start();
    if (this.useItemCollection) {
      await this.itemStore.start();
    }
  }

  async forceReset() {
    try {
      await this.userStore.clear();
      if (this.useItemCollection) {
        await this.itemStore.clear();
      }
      return true;
    } catch (error) {
      throw new CurrencySystemError(`Failed to reset database: ${error.message}`, 'RESET_FAILED');
    }
  }

  async getData(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new CurrencySystemError('Invalid user ID', 'INVALID_USER_ID');
    }
    const data = await this.userStore.get(userId);
    if (data === null) {
      const defaultData = { balance: this.defaultBalance, name: null, exp: 0, inventory: {} };
      await this.userStore.put(userId, defaultData);
      return defaultData;
    }
    return typeof data === 'object'
      ? { balance: data.balance || this.defaultBalance, name: data.name || null, exp: data.exp || 0, inventory: data.inventory || {} }
      : { balance: data, name: null, exp: 0, inventory: {} };
  }

  async setData(userId, data) {
    if (!userId || typeof data !== 'object') {
      throw new CurrencySystemError('Invalid user ID or data', 'INVALID_INPUT');
    }
    if (data.balance !== undefined && (typeof data.balance !== 'number' || data.balance < 0)) {
      throw new CurrencySystemError('Balance cannot be negative', 'INVALID_BALANCE');
    }
    const currentData = await this.getData(userId);
    const newData = { ...currentData, ...data };
    await this.userStore.put(userId, newData);
    return newData;
  }

  async getBalance(userId) {
    const data = await this.getData(userId);
    return data.balance;
  }

  async setName(userId, name) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new CurrencySystemError('Name must be a non-empty string', 'INVALID_NAME');
    }
    return this.setData(userId, { name: name.trim() });
  }

  async addBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new CurrencySystemError('Amount must be a positive number', 'INVALID_AMOUNT');
    }
    const data = await this.getData(userId);
    const newBalance = (data.balance || this.defaultBalance) + amount;
    await this.setData(userId, { balance: newBalance });
    return newBalance;
  }

  async increaseMoney(userId, amount) {
    return this.addBalance(userId, amount);
  }

  async increaseExp(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new CurrencySystemError('Amount must be a positive number', 'INVALID_AMOUNT');
    }
    const data = await this.getData(userId);
    const newExp = (data.exp || 0) + amount;
    await this.setData(userId, { exp: newExp });
    return newExp;
  }

  async removeBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new CurrencySystemError('Amount must be a positive number', 'INVALID_AMOUNT');
    }
    const data = await this.getData(userId);
    const currentBalance = data.balance || this.defaultBalance;
    if (currentBalance < amount) {
      throw new CurrencySystemError('Insufficient balance', 'INSUFFICIENT_BALANCE');
    }
    const newBalance = currentBalance - amount;
    await this.setData(userId, { balance: newBalance });
    return newBalance;
  }

  async transferBalance(fromUserId, toUserId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new CurrencySystemError('Amount must be a positive number', 'INVALID_AMOUNT');
    }
    const session = await this.userStore.client.startSession();
    try {
      session.startTransaction();
      const fromData = await this.getData(fromUserId);
      const toData = await this.getData(toUserId);
      const fromBalance = fromData.balance || this.defaultBalance;
      const toBalance = toData.balance || this.defaultBalance;
      if (fromBalance < amount) {
        throw new CurrencySystemError('Insufficient balance', 'INSUFFICIENT_BALANCE');
      }
      await this.userStore.bulkPut(
        {
          [fromUserId]: { ...fromData, balance: fromBalance - amount },
          [toUserId]: { ...toData, balance: toBalance + amount },
        },
        { session }
      );
      await session.commitTransaction();
      return { fromBalance: fromBalance - amount, toBalance: toBalance + amount };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getLeaderboard(limit = 10) {
    const pipeline = [
      { $match: { balance: { $gt: 0 } } },
      { $project: { userId: '$_id', balance: 1, name: 1 } },
      { $sort: { balance: -1 } },
      { $limit: limit },
    ];
    const results = await this.userStore.collection.aggregate(pipeline).toArray();
    return results.map(doc => ({
      userId: doc.userId,
      balance: doc.balance || 0,
      name: doc.name || null,
    }));
  }

  async createItem(itemData, itemId = null) {
    if (!this.useItemCollection) {
      throw new CurrencySystemError('Item collection is disabled', 'ITEM_COLLECTION_DISABLED');
    }
    if (typeof itemData !== 'object' || !itemData.name || !itemData.price || typeof itemData.price !== 'number') {
      throw new CurrencySystemError('Item data must include a name and a valid price', 'INVALID_ITEM_DATA');
    }
    const id = itemId || CurrencySystem.generateId();
    const existingItem = await this.itemStore.get(id);
    if (existingItem) {
      throw new CurrencySystemError(`Item with ID ${id} already exists`, 'ITEM_EXISTS');
    }
    const newItem = {
      id,
      name: itemData.name.trim(),
      price: itemData.price,
      description: itemData.description || '',
      category: itemData.category || 'misc',
      custom: itemData.custom || {},
    };
    await this.itemStore.put(id, newItem);
    this.cache.set(id, newItem);
    return newItem;
  }

  async _resolveItemId(identifier) {
    if (!this.useItemCollection) {
      throw new CurrencySystemError('Item collection is disabled', 'ITEM_COLLECTION_DISABLED');
    }
    if (this.cache.has(identifier)) {
      return identifier;
    }
    const item = await this.itemStore.get(identifier);
    if (item) {
      this.cache.set(identifier, item);
      return identifier;
    }
    const entries = await this.itemStore.entries();
    const match = entries
      .map(({ key, value }) => ({ id: key, ...value }))
      .find(item => item.name.toLowerCase() === identifier.toLowerCase());
    if (!match) {
      throw new CurrencySystemError(`No item found matching "${identifier}"`, 'ITEM_NOT_FOUND');
    }
    this.cache.set(match.id, match);
    return match.id;
  }

  async getItem(identifier) {
    if (!this.useItemCollection) {
      throw new CurrencySystemError('Item collection is disabled', 'ITEM_COLLECTION_DISABLED');
    }
    const itemId = await this._resolveItemId(identifier);
    if (this.cache.has(itemId)) {
      return this.cache.get(itemId);
    }
    const item = await this.itemStore.get(itemId);
    if (!item) {
      throw new CurrencySystemError(`Item with ID ${itemId} not found`, 'ITEM_NOT_FOUND');
    }
    this.cache.set(itemId, item);
    return item;
  }

  async findItem(searchTerm) {
    if (!this.useItemCollection) {
      throw new CurrencySystemError('Item collection is disabled', 'ITEM_COLLECTION_DISABLED');
    }
    const entries = await this.itemStore.entries();
    const matches = entries
      .map(({ key, value }) => ({ id: key, ...value }))
      .filter(item =>
        item.id === searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (matches.length === 0) {
      throw new CurrencySystemError(`No items found matching "${searchTerm}"`, 'ITEM_NOT_FOUND');
    }
    matches.forEach(item => this.cache.set(item.id, item));
    return matches;
  }

  async addItem(userId, identifier, quantity = 1, customProps = {}) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new CurrencySystemError('Quantity must be a positive number', 'INVALID_QUANTITY');
    }
    let itemId = identifier;
    if (this.useItemCollection) {
      itemId = await this._resolveItemId(identifier);
    }
    const data = await this.getData(userId);
    const inventory = data.inventory || {};
    const currentQuantity = inventory[itemId]?.quantity || 0;
    const maxInventorySize = 100;
    if (currentQuantity + quantity > maxInventorySize) {
      throw new CurrencySystemError('Inventory limit exceeded', 'INVENTORY_FULL');
    }
    inventory[itemId] = {
      quantity: currentQuantity + quantity,
      ...customProps,
    };
    await this.setData(userId, { inventory });
    return inventory[itemId];
  }

  async removeItem(userId, identifier, quantity = 1) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new CurrencySystemError('Quantity must be a positive number', 'INVALID_QUANTITY');
    }
    let itemId = identifier;
    if (this.useItemCollection) {
      itemId = await this._resolveItemId(identifier);
    }
    const data = await this.getData(userId);
    const inventory = data.inventory || {};
    if (!inventory[itemId] || inventory[itemId].quantity < quantity) {
      throw new CurrencySystemError('Insufficient item quantity', 'INSUFFICIENT_QUANTITY');
    }
    inventory[itemId].quantity -= quantity;
    if (inventory[itemId].quantity <= 0) {
      delete inventory[itemId];
    }
    await this.setData(userId, { inventory });
    return inventory[itemId] || null;
  }

  async getInventory(userId) {
    const data = await this.getData(userId);
    return data.inventory || {};
  }

  async buyItem(userId, identifier, quantity = 1) {
    if (!this.useItemCollection) {
      throw new CurrencySystemError('Item collection is disabled', 'ITEM_COLLECTION_DISABLED');
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new CurrencySystemError('Quantity must be a positive number', 'INVALID_QUANTITY');
    }
    const session = await this.userStore.client.startSession();
    try {
      session.startTransaction();
      const itemId = await this._resolveItemId(identifier);
      const item = await this.getItem(itemId);
      const totalCost = item.price * quantity;
      const currentBalance = await this.getBalance(userId);
      if (currentBalance < totalCost) {
        throw new CurrencySystemError('Insufficient balance to buy item', 'INSUFFICIENT_BALANCE');
      }
      await this.removeBalance(userId, totalCost);
      await this.addItem(userId, itemId, quantity);
      await session.commitTransaction();
      return { itemId, quantity, totalCost };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async sellItem(userId, identifier, quantity = 1, sellPriceMultiplier = 0.5) {
    if (!this.useItemCollection) {
      throw new CurrencySystemError('Item collection is disabled', 'ITEM_COLLECTION_DISABLED');
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new CurrencySystemError('Quantity must be a positive number', 'INVALID_QUANTITY');
    }
    if (typeof sellPriceMultiplier !== 'number' || sellPriceMultiplier < 0 || sellPriceMultiplier > 1) {
      throw new CurrencySystemError('Sell price multiplier must be a number between 0 and 1', 'INVALID_MULTIPLIER');
    }
    const session = await this.userStore.client.startSession();
    try {
      session.startTransaction();
      const itemId = await this._resolveItemId(identifier);
      const item = await this.getItem(itemId);
      const data = await this.getData(userId);
      const inventory = data.inventory || {};
      if (!inventory[itemId] || inventory[itemId].quantity < quantity) {
        throw new CurrencySystemError('Insufficient item quantity in inventory', 'INSUFFICIENT_QUANTITY');
      }
      const sellPrice = Math.floor(item.price * quantity * sellPriceMultiplier);
      await this.removeItem(userId, itemId, quantity);
      const newBalance = await this.addBalance(userId, sellPrice);
      await session.commitTransaction();
      return { itemId, quantity, sellPrice, newBalance };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteItem(identifier, removeFromInventories = true) {
    if (!this.useItemCollection) {
      throw new CurrencySystemError('Item collection is disabled', 'ITEM_COLLECTION_DISABLED');
    }
    const itemId = await this._resolveItemId(identifier);
    const item = await this.itemStore.get(itemId);
    if (!item) {
      throw new CurrencySystemError(`Item with ID ${itemId} not found`, 'ITEM_NOT_FOUND');
    }
    await this.itemStore.delete(itemId);
    this.cache.delete(itemId);
    if (removeFromInventories) {
      await this.userStore.collection.updateMany(
        { [`inventory.${itemId}`]: { $exists: true } },
        { $unset: { [`inventory.${itemId}`]: "" } }
      );
    }
    return true;
  }

  async addKeyValue(userId, key, value) {
    if (!userId) throw new CurrencySystemError('User ID is required', 'INVALID_USER_ID');
    if (typeof key !== 'string' || key.trim() === '') {
      throw new CurrencySystemError('Key must be a non-empty string', 'INVALID_KEY');
    }
    if (['balance', 'name', 'exp', 'inventory'].includes(key)) {
      throw new CurrencySystemError('Cannot overwrite reserved fields', 'RESERVED_FIELD');
    }
    return this.setData(userId, { [key]: value });
  }

  async deleteUser(userId) {
    if (!userId) {
      throw new CurrencySystemError('User ID is required', 'INVALID_USER_ID');
    }
    const data = await this.getData(userId);
    if (data === null) {
      throw new CurrencySystemError('User not found', 'USER_NOT_FOUND');
    }
    await this.userStore.delete(userId);
    return true;
  }

  async close() {
    await this.userStore.close();
    if (this.useItemCollection) {
      await this.itemStore.close();
    }
    this.cache.clear();
  }
}

module.exports = { CurrencySystem };