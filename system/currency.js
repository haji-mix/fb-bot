 const { createStore } = require("./dbStore");

const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

class CurrencySystem {
  constructor({
    mongoUri = process.env.mongo_uri || global.api.mongo_uri,
    database = 'currency',
    userCollection = 'balances',
    itemCollection = 'items',
    defaultBalance = 0,
    useItemCollection = true,
  }) {
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
      throw new Error(`Failed to reset database: ${error.message}`);
    }
  }

  async getData(userId) {
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
      throw new Error('Invalid user ID or data');
    }
    const currentData = await this.getData(userId);
    const newData = { ...currentData, ...data };
    await this.userStore.put(userId, newData);
    return newData;
  }

  async setBalance(userId, amount) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error('Amount must be a non-negative number');
    }
    const data = await this.getData(userId);
    await this.setData(userId, { ...data, balance: amount });
    return amount;
  }

  async getBalance(userId) {
    const data = await this.getData(userId);
    return data.balance;
  }

  async setName(userId, name) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Name must be a non-empty string');
    }
    return this.setData(userId, { name: name.trim() });
  }

  async addBalance(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
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
      throw new Error('Amount must be a positive number');
    }
    const data = await this.getData(userId);
    const newExp = (data.exp || 0) + amount;
    await this.setData(userId, { exp: newExp });
    return newExp;
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
    const newBalance = currentBalance - amount;
    await this.setData(userId, { balance: newBalance });
    return newBalance;
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
    await this.userStore.bulkPut({
      [fromUserId]: { ...fromData, balance: fromBalance - amount },
      [toUserId]: { ...toData, balance: toBalance + amount },
    });
    return { fromBalance: fromBalance - amount, toBalance: toBalance + amount };
  }

  async getLeaderboard(limit = 10) {
  const entries = await this.userStore.entries();
  return entries
    .map(({ key, value }) => ({
      userId: key,
      balance: typeof value === 'object' ? value.balance : value,
      name: typeof value === 'object' ? value.name : null,
    }))
    .filter(user => user.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

  async createItem(itemData, itemId = null) {
    if (!this.useItemCollection) {
      throw new Error('Item collection is disabled');
    }
    if (typeof itemData !== 'object' || !itemData.name || !itemData.price || typeof itemData.price !== 'number') {
      throw new Error('Item data must include a name and a valid price');
    }
    const id = itemId || generateId();
    const existingItem = await this.itemStore.get(id);
    if (existingItem) {
      throw new Error(`Item with ID ${id} already exists`);
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
    return newItem;
  }

  async _resolveItemId(identifier) {
    if (!this.useItemCollection) {
      throw new Error('Item collection is disabled');
    }
    const item = await this.itemStore.get(identifier);
    if (item) {
      return identifier;
    }
    const entries = await this.itemStore.entries();
    const match = entries
      .map(({ key, value }) => ({ id: key, ...value }))
      .find(item => item.name.toLowerCase() === identifier.toLowerCase());
    if (!match) {
      throw new Error(`No item found matching "${identifier}"`);
    }
    return match.id;
  }

  async getItem(identifier) {
    if (!this.useItemCollection) {
      throw new Error('Item collection is disabled');
    }
    const itemId = await this._resolveItemId(identifier);
    const item = await this.itemStore.get(itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    return item;
  }

  async findItem(searchTerm) {
    if (!this.useItemCollection) {
      throw new Error('Item collection is disabled');
    }
    const entries = await this.itemStore.entries();
    const matches = entries
      .map(({ key, value }) => ({ id: key, ...value }))
      .filter(item =>
        item.id === searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (matches.length === 0) {
      throw new Error(`No items found matching "${searchTerm}"`);
    }
    return matches;
  }

  async addItem(userId, identifier, quantity = 1, customProps = {}) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }
    let itemId = identifier;
    if (this.useItemCollection) {
      itemId = await this._resolveItemId(identifier);
    }
    const data = await this.getData(userId);
    const inventory = data.inventory || {};
    const currentQuantity = inventory[itemId]?.quantity || 0;
    inventory[itemId] = {
      quantity: currentQuantity + quantity,
      ...customProps,
    };
    await this.setData(userId, { inventory });
    return inventory[itemId];
  }

  async removeItem(userId, identifier, quantity = 1) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }
    let itemId = identifier;
    if (this.useItemCollection) {
      itemId = await this._resolveItemId(identifier);
    }
    const data = await this.getData(userId);
    const inventory = data.inventory || {};
    if (!inventory[itemId] || inventory[itemId].quantity < quantity) {
      throw new Error('Insufficient item quantity');
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
      throw new Error('Item collection is disabled');
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }
    const itemId = await this._resolveItemId(identifier);
    const item = await this.getItem(itemId);
    const totalCost = item.price * quantity;
    const currentBalance = await this.getBalance(userId);
    if (currentBalance < totalCost) {
      throw new Error('Insufficient balance to buy item');
    }
    await this.removeBalance(userId, totalCost);
    await this.addItem(userId, itemId, quantity);
    return { itemId, quantity, totalCost };
  }
  
  async sellItem(userId, identifier, quantity = 1, sellPriceMultiplier = 0.5) {
  if (!this.useItemCollection) {
    throw new Error('Item collection is disabled');
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    throw new Error('Quantity must be a positive number');
  }
  if (typeof sellPriceMultiplier !== 'number' || sellPriceMultiplier < 0 || sellPriceMultiplier > 1) {
    throw new Error('Sell price multiplier must be a number between 0 and 1');
  }

  const itemId = await this._resolveItemId(identifier);
  const item = await this.getItem(itemId);

  const data = await this.getData(userId);
  const inventory = data.inventory || {};
  if (!inventory[itemId] || inventory[itemId].quantity < quantity) {
    throw new Error('Insufficient item quantity in inventory');
  }

  const sellPrice = Math.floor(item.price * quantity * sellPriceMultiplier);

  await this.removeItem(userId, itemId, quantity);
  const newBalance = await this.addBalance(userId, sellPrice);

  return { itemId, quantity, sellPrice, newBalance };
}

  async deleteItem(identifier, removeFromInventories = true) {
    if (!this.useItemCollection) {
      throw new Error('Item collection is disabled');
    }
    const itemId = await this._resolveItemId(identifier);
    const item = await this.itemStore.get(itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    await this.itemStore.delete(itemId);
    if (removeFromInventories) {
      const entries = await this.userStore.entries();
      const updates = {};
      entries.forEach(({ key, value }) => {
        if (value.inventory && value.inventory[itemId]) {
          delete value.inventory[itemId];
          updates[key] = { ...value, inventory: value.inventory };
        }
      });
      if (Object.keys(updates).length > 0) {
        await this.userStore.bulkPut(updates);
      }
    }
    return true;
  }

  async getName(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const data = await this.getData(userId);
    return data.name;
  }

  async addKeyValue(userId, key, value) {
    if (!userId) throw new Error('User ID is required');
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Key must be a non-empty string');
    }
    if (key === 'balance' || key === 'name' || key === 'exp' || key === 'inventory') {
      throw new Error('Cannot overwrite reserved fields: balance, name, exp, or inventory');
    }
    return this.setData(userId, { [key]: value });
  }

  async deleteUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const data = await this.getData(userId);
    if (data === null) {
      throw new Error('User not found');
    }
    await this.userStore.delete(userId);
    return true;
  }

  async close() {
    await this.userStore.close();
    if (this.useItemCollection) {
      await this.itemStore.close();
    }
  }
}

module.exports = { CurrencySystem };
