
const DEFAULT_CONFIG = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  database: 'FB_AUTOBOT',
  userCollection: 'currency_balances',
  itemCollection: 'items',
  defaultBalance: 0,
  useItemCollection: true,
  retryAttempts: 3,
  retryDelayMs: 100,
  userSchema: {
    balance: { type: 'number', default: 0 },
    name: { type: 'string', default: null },
    exp: { type: 'number', default: 0 },
    inventory: { type: 'object', default: {} },
    garden: { type: 'object', default: { crops: [], decorations: [] } },
  },
};


const defaultGenerateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

class CustomError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'CustomError';
  }
}

class Validator {
  static validate(obj, schema) {
    for (const [key, type] of Object.entries(schema)) {
      if (!(key in obj) || !Validator.validateType(obj[key], type)) {
        throw new CustomError('ValidationError', `Invalid ${key}: expected ${type}`);
      }
    }
    return obj;
  }

  static validateType(value, expectedType) {
    if (expectedType.includes('|')) {
      return expectedType.split('|').map(t => t.trim()).some(t => Validator.checkType(value, t));
    }
    return Validator.checkType(value, expectedType);
  }

  static checkType(value, type) {
    if (type === 'undefined') return value === undefined;
    if (type === 'string') return typeof value === 'string' && value.trim() !== '';
    if (type === 'number') return typeof value === 'number' && !isNaN(value);
    if (type === 'object') return typeof value === 'object' && value !== null;
    return false;
  }

  static validateConfig(config) {
    if (!config.mongoUri) throw new CustomError('InvalidConfiguration', 'mongoUri is required');
    if (!config.database) throw new CustomError('InvalidConfiguration', 'database is required');
    return config;
  }
}

class CurrencySystem {
  constructor({
    createStore, 
    generateId = defaultGenerateId, 
    config = {}, 
  } = {}) {
    if (!createStore) {
      throw new CustomError('InvalidConfiguration', 'createStore function is required');
    }

    this.config = Validator.validateConfig({ ...DEFAULT_CONFIG, ...config });
    this.createStore = createStore;
    this.generateId = generateId;

    this.userStore = this.createStore({
      type: 'mongodb',
      uri: this.config.mongoUri,
      database: this.config.database,
      collection: this.config.userCollection,
      ignoreError: false,
      allowClear: true,
    });

    if (this.config.useItemCollection) {
      this.itemStore = this.createStore({
        type: 'mongodb',
        uri: this.config.mongoUri,
        database: this.config.database,
        collection: this.config.itemCollection,
        ignoreError: false,
        allowClear: true,
      });
    }
  }

  async init() {
    try {
      await this.userStore.start();
      if (this.config.useItemCollection) {
        await this.itemStore.start();
      }
    } catch (error) {
      throw new CustomError('InitializationFailed', `Failed to initialize stores: ${error.message}`);
    }
  }

  async withRetry(operation, retries = this.config.retryAttempts) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) {
          throw new CustomError('OperationFailed', `Operation failed after ${retries} retries: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
      }
    }
  }

  initializeDefaultData() {
    return Object.entries(this.config.userSchema).reduce((acc, [key, { default: defaultValue }]) => {
      acc[key] = defaultValue;
      return acc;
    }, {});
  }

  normalizeData(data) {
    const normalized = {};
    for (const [key, { default: defaultValue, type }] of Object.entries(this.config.userSchema)) {
      normalized[key] = data[key] !== undefined && typeof data[key] === type ? data[key] : defaultValue;
    }
    return normalized;
  }

  async getData(userId) {
    Validator.validate({ userId }, { userId: 'string' });

    const data = await this.userStore.get(userId);
    if (data === null) {
      const defaultData = this.initializeDefaultData();
      await this.withRetry(() => this.userStore.put(userId, defaultData));
      console.log(`Initialized data for user ${userId}:`, JSON.stringify(defaultData));
      return defaultData;
    }

    return this.normalizeData(data);
  }

  async setData(userId, updates) {
    Validator.validate({ userId, updates }, { userId: 'string', updates: 'object' });

    const currentData = await this.getData(userId);
    const newData = { ...currentData, ...updates };

    // Validate updated fields against schema
    for (const [key, value] of Object.entries(updates)) {
      if (this.config.userSchema[key]) {
        Validator.validateType(value, this.config.userSchema[key].type, `Invalid ${key}`);
      }
    }

    return this.withRetry(async () => {
      await this.userStore.put(userId, newData);
      console.log(`Updated data for user ${userId}:`, JSON.stringify(newData));
      return newData;
    });
  }

  async forceReset() {
    try {
      await this.userStore.clear();
      if (this.config.useItemCollection) {
        await this.itemStore.clear();
      }
      return true;
    } catch (error) {
      throw new CustomError('ResetFailed', `Failed to reset database: ${error.message}`);
    }
  }

  async getBalance(userId) {
    const data = await this.getData(userId);
    return data.balance;
  }

  async setBalance(userId, amount) {
    Validator.validate({ userId, amount }, { userId: 'string', amount: 'number' });
    if (amount < 0) throw new CustomError('InvalidAmount', 'Amount must be non-negative');

    const data = await this.getData(userId);
    return this.setData(userId, { ...data, balance: amount });
  }

  async addBalance(userId, amount) {
    Validator.validate({ userId, amount }, { userId: 'string', amount: 'number' });
    if (amount <= 0) throw new CustomError('InvalidAmount', 'Amount must be positive');

    const data = await this.getData(userId);
    const newBalance = (data.balance || 0) + amount;
    await this.setData(userId, { balance: newBalance });
    return newBalance;
  }

  async removeBalance(userId, amount) {
    Validator.validate({ userId, amount }, { userId: 'string', amount: 'number' });
    if (amount <= 0) throw new CustomError('InvalidAmount', 'Amount must be positive');

    const data = await this.getData(userId);
    const currentBalance = data.balance || 0;
    if (currentBalance < amount) throw new CustomError('InsufficientBalance', 'Insufficient balance');

    const newBalance = currentBalance - amount;
    await this.setData(userId, { balance: newBalance });
    return newBalance;
  }

  async transferBalance(fromUserId, toUserId, amount) {
    Validator.validate({ fromUserId, toUserId, amount }, { fromUserId: 'string', toUserId: 'string', amount: 'number' });
    if (amount <= 0) throw new CustomError('InvalidAmount', 'Amount must be positive');

    const fromData = await this.getData(fromUserId);
    const toData = await this.getData(toUserId);
    const fromBalance = fromData.balance || 0;
    const toBalance = toData.balance || 0;

    if (fromBalance < amount) throw new CustomError('InsufficientBalance', 'Insufficient balance');

    await this.withRetry(() => this.userStore.bulkPut({
      [fromUserId]: { ...fromData, balance: fromBalance - amount },
      [toUserId]: { ...toData, balance: toBalance + amount },
    }));

    return { fromBalance: fromBalance - amount, toBalance: toBalance + amount };
  }

  async increaseExp(userId, amount) {
    Validator.validate({ userId, amount }, { userId: 'string', amount: 'number' });
    if (amount <= 0) throw new CustomError('InvalidAmount', 'Amount must be positive');

    const data = await this.getData(userId);
    const newExp = (data.exp || 0) + amount;
    await this.setData(userId, { exp: newExp });
    return newExp;
  }

  async setName(userId, name) {
    Validator.validate({ userId, name }, { userId: 'string', name: 'string' });
    return this.setData(userId, { name: name.trim() });
  }

  async getName(userId) {
    Validator.validate({ userId }, { userId: 'string' });
    const data = await this.getData(userId);
    return data.name;
  }

  async getLeaderboard(limit = 10) {
    Validator.validate({ limit }, { limit: 'number' });
    if (limit <= 0) throw new CustomError('InvalidLimit', 'Limit must be positive');

    const entries = await this.userStore.entries();
    return entries
      .map(({ key, value }) => ({
        userId: key,
        balance: value.balance || 0,
        name: value.name || null,
      }))
      .filter(user => user.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  async createItem(itemData, itemId = null) {
    if (!this.config.useItemCollection) {
      throw new CustomError('ItemCollectionDisabled', 'Item collection is disabled');
    }

    Validator.validate(itemData, {
      name: 'string',
      price: 'number',
      description: 'string | undefined',
      category: 'string | undefined',
      custom: 'object | undefined',
      metadata: 'object | undefined',
    });

    const trimmedName = itemData.name.trim();
    const existingItem = await this.findItemByName(trimmedName);
    if (existingItem) {
      throw new CustomError('ItemExists', `Item with name "${trimmedName}" already exists`);
    }

    const id = itemId || this.generateId();
    const newItem = {
      id,
      name: trimmedName,
      price: itemData.price,
      description: itemData.description || '',
      category: itemData.category || 'misc',
      custom: itemData.custom || {},
      metadata: itemData.metadata || {},
    };

    await this.withRetry(() => this.itemStore.put(id, newItem));
    console.log(`Created item ${trimmedName} with ID ${id}:`, JSON.stringify(newItem));
    return newItem;
  }

  async findItemByName(name) {
    const entries = await this.itemStore.entries();
    return entries
      .map(({ value }) => value)
      .find(item => item.name.toLowerCase() === name.toLowerCase());
  }

  async resolveItemId(identifier) {
    if (!this.config.useItemCollection) {
      throw new CustomError('ItemCollectionDisabled', 'Item collection is disabled');
    }

    const item = await this.itemStore.get(identifier);
    if (item) return identifier;

    const entries = await this.itemStore.entries();
    const match = entries
      .map(({ key, value }) => ({ id: key, ...value }))
      .find(item => item.name.toLowerCase() === identifier.toLowerCase());
    if (!match) {
      throw new CustomError('ItemNotFound', `No item found for "${identifier}"`);
    }
    return match.id;
  }

  async getItem(identifier) {
    const itemId = await this.resolveItemId(identifier);
    const item = await this.itemStore.get(itemId);
    if (!item) {
      throw new CustomError('ItemNotFound', `Item with ID ${itemId} not found`);
    }
    return item;
  }

  async findItem(searchTerm) {
    if (!this.config.useItemCollection) {
      throw new CustomError('ItemCollectionDisabled', 'Item collection is disabled');
    }

    Validator.validate({ searchTerm }, { searchTerm: 'string' });
    const entries = await this.itemStore.entries();
    const matches = entries
      .map(({ key, value }) => ({ id: key, ...value }))
      .filter(item =>
        item.id === searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (matches.length === 0) {
      throw new CustomError('ItemNotFound', `No items found matching "${searchTerm}"`);
    }
    return matches;
  }

  async addItem(userId, identifier, quantity = 1, customProps = {}) {
    Validator.validate({ userId, identifier, quantity, customProps }, {
      userId: 'string',
      identifier: 'string',
      quantity: 'number',
      customProps: 'object',
    });
    if (quantity <= 0) throw new CustomError('InvalidQuantity', 'Quantity must be positive');

    let itemId = identifier;
    if (this.config.useItemCollection) {
      itemId = await this.resolveItemId(identifier);
    }

    const data = await this.getData(userId);
    const inventory = { ...data.inventory };
    const currentQuantity = inventory[itemId]?.quantity || 0;
    inventory[itemId] = {
      quantity: currentQuantity + quantity,
      ...customProps,
    };

    await this.setData(userId, { inventory });
    return inventory[itemId];
  }

  async removeItem(userId, identifier, quantity = 1) {
    Validator.validate({ userId, identifier, quantity }, {
      userId: 'string',
      identifier: 'string',
      quantity: 'number',
    });
    if (quantity <= 0) throw new CustomError('InvalidQuantity', 'Quantity must be positive');

    let itemId = identifier;
    if (this.config.useItemCollection) {
      itemId = await this.resolveItemId(identifier);
    }

    const data = await this.getData(userId);
    const inventory = { ...data.inventory };
    if (!inventory[itemId] || inventory[itemId].quantity < quantity) {
      throw new CustomError('InsufficientQuantity', 'Insufficient item quantity');
    }

    inventory[itemId].quantity -= quantity;
    if (inventory[itemId].quantity <= 0) {
      delete inventory[itemId];
    }

    await this.setData(userId, { inventory });
    return inventory[itemId] || null;
  }

  async getInventory(userId) {
    Validator.validate({ userId }, { userId: 'string' });
    const data = await this.getData(userId);
    return data.inventory || {};
  }

  async buyItem(userId, identifier, quantity = 1) {
    if (!this.config.useItemCollection) {
      throw new CustomError('ItemCollectionDisabled', 'Item collection is disabled');
    }

    Validator.validate({ userId, identifier, quantity }, {
      userId: 'string',
      identifier: 'string',
      quantity: 'number',
    });
    if (quantity <= 0) throw new CustomError('InvalidQuantity', 'Quantity must be positive');

    const itemId = await this.resolveItemId(identifier);
    const item = await this.getItem(itemId);
    const totalCost = item.price * quantity;
    const currentBalance = await this.getBalance(userId);

    if (currentBalance < totalCost) {
      throw new CustomError('InsufficientBalance', 'Insufficient balance to buy item');
    }

    await this.removeBalance(userId, totalCost);
    await this.addItem(userId, itemId, quantity);
    return { itemId, quantity, totalCost };
  }

  async sellItem(userId, identifier, quantity = 1, sellPriceMultiplier = 0.5) {
    if (!this.config.useItemCollection) {
      throw new CustomError('ItemCollectionDisabled', 'Item collection is disabled');
    }

    Validator.validate({ userId, identifier, quantity, sellPriceMultiplier }, {
      userId: 'string',
      identifier: 'string',
      quantity: 'number',
      sellPriceMultiplier: 'number',
    });
    if (quantity <= 0) throw new CustomError('InvalidQuantity', 'Quantity must be positive');
    if (sellPriceMultiplier < 0 || sellPriceMultiplier > 1) {
      throw new CustomError('InvalidMultiplier', 'Sell price multiplier must be between 0 and 1');
    }

    const itemId = await this.resolveItemId(identifier);
    const item = await this.getItem(itemId);
    const sellPrice = Math.floor(item.price * quantity * sellPriceMultiplier);

    await this.removeItem(userId, itemId, quantity);
    const newBalance = await this.addBalance(userId, sellPrice);
    return { itemId, quantity, sellPrice, newBalance };
  }

  async deleteItem(identifier, removeFromInventories = true) {
    if (!this.config.useItemCollection) {
      throw new CustomError('ItemCollectionDisabled', 'Item collection is disabled');
    }

    const itemId = await this.resolveItemId(identifier);
    const item = await this.itemStore.get(itemId);
    if (!item) {
      throw new CustomError('ItemNotFound', `Item with ID ${itemId} not found`);
    }

    await this.itemStore.delete(itemId);
    if (removeFromInventories) {
      const entries = await this.userStore.entries();
      const updates = {};
      entries.forEach(({ key, value }) => {
        if (value.inventory && value.inventory[itemId]) {
          const updatedInventory = { ...value.inventory };
          delete updatedInventory[itemId];
          updates[key] = { ...value, inventory: updatedInventory };
        }
      });
      if (Object.keys(updates).length > 0) {
        await this.userStore.bulkPut(updates);
      }
    }
    return true;
  }

  async addKeyValue(userId, key, value) {
    Validator.validate({ userId, key }, { userId: 'string', key: 'string' });
    if (Object.keys(this.config.userSchema).includes(key)) {
      throw new CustomError('ReservedField', 'Cannot overwrite reserved fields');
    }
    return this.setData(userId, { [key]: value });
  }

  async deleteUser(userId) {
    Validator.validate({ userId }, { userId: 'string' });
    const data = await this.getData(userId);
    if (data === null) {
      throw new CustomError('UserNotFound', 'User not found');
    }
    await this.userStore.delete(userId);
    return true;
  }

  async close() {
    try {
      await this.userStore.close();
      if (this.config.useItemCollection) {
        await this.itemStore.close();
      }
    } catch (error) {
      throw new CustomError('CloseFailed', `Failed to close stores: ${error.message}`);
    }
  }
}

module.exports = { CurrencySystem };