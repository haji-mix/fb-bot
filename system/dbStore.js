const mongoose = require("mongoose");

class MongoConnectionManager {
  static connections = new Map();

  static async getConnection(uri, options = {}) {
    if (this.connections.has(uri)) {
      const connection = this.connections.get(uri);
      if (connection.readyState === 1 || connection.readyState === 2) {
        return connection;
      }

      this.connections.delete(uri);
    }

    try {
      mongoose.set("strictQuery", true);
      const connection = await mongoose.createConnection(uri, {
        retryWrites: true,
        w: "majority",
        ...options,
      }).asPromise();
      this.connections.set(uri, connection);
      return connection;
    } catch (error) {
      throw new Error(`Failed to connect to MongoDB at ${uri}: ${error.message}`);
    }
  }

  static async closeConnection(uri) {
    if (this.connections.has(uri)) {
      const connection = this.connections.get(uri);
      await connection.close();
      this.connections.delete(uri);
    }
  }

  static async closeAllConnections() {
    for (const [uri, connection] of this.connections) {
      await connection.close();
      this.connections.delete(uri);
    }
  }
}

class Store {
  async start() {}
  async get(key) {}
  async put(key, value) {}
  async bulkPut(pairs) {}
  async remove(key) {}
  async containsKey(key) {}
  async size() {}
  async keys() {}
  async values() {}
  async entries() {}
  async preProc(data) {}
  async load() {}
  async clear() {}
  async toObject() {}
  async toJSON() {}
  async *[Symbol.iterator]() {}
  async *iKeys() {}
  async *iValues() {}
}

class MongoStore extends Store {
  constructor({
    uri,
    database,
    collection,
    ignoreError = false,
    allowClear = false,
  }) {
    super();
    this.uri = database ? `${uri.replace(/\/[^\/]*$/, "")}/${database}` : uri;
    this.collectionName = collection;
    this.ignoreError = ignoreError;
    this.allowClear = allowClear;
    this.connection = null;
    this.KeyValue = null;
  }

  async start() {
    try {
      // Get or reuse connection
      this.connection = await MongoConnectionManager.getConnection(this.uri);

      // Define schema and model
      const keyValueSchema = new mongoose.Schema({
        key: { type: String, required: true, unique: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
      });

      // Use the connection-specific model to avoid model conflicts
      this.KeyValue = this.connection.model(this.collectionName, keyValueSchema);
    } catch (error) {
      if (this.ignoreError) {
        console.error(`MongoStore start error (ignored): ${error.message}`);
        return;
      }
      throw error;
    }
  }

  async get(key) {
    try {
      const result = await this.KeyValue.findOne({ key: String(key) });
      return result ? result.value : null;
    } catch (error) {
      if (this.ignoreError) return null;
      throw error;
    }
  }

  async put(key, value) {
    try {
      await this.KeyValue.findOneAndUpdate(
        { key: String(key) },
        { key: String(key), value },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async bulkPut(pairs) {
    try {
      const operations = Object.entries(pairs).map(([key, value]) => ({
        updateOne: {
          filter: { key: String(key) },
          update: { key: String(key), value },
          upsert: true,
        },
      }));
      await this.KeyValue.bulkWrite(operations);
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async remove(key) {
    try {
      await this.KeyValue.deleteOne({ key: String(key) });
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async containsKey(key) {
    try {
      const count = await this.KeyValue.countDocuments({ key: String(key) });
      return count > 0;
    } catch (error) {
      if (this.ignoreError) return false;
      throw error;
    }
  }

  async size() {
    try {
      return await this.KeyValue.countDocuments();
    } catch (error) {
      if (this.ignoreError) return 0;
      throw error;
    }
  }

  async keys() {
    try {
      const results = await this.KeyValue.find({}, "key");
      return results.map((doc) => doc.key);
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async values() {
    try {
      const results = await this.KeyValue.find({}, "value");
      return results.map((doc) => doc.value);
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async entries() {
    try {
      const results = await this.KeyValue.find({}, "key value");
      return results.map((doc) => ({ key: doc.key, value: doc.value }));
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async preProc(data) {
    return data;
  }

  async load() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return await this.preProc(result);
  }

  async clear() {
    if (!this.allowClear) {
      throw new Error("Clearing the collection is not allowed.");
    }
    try {
      await this.KeyValue.deleteMany({});
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async toObject() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return result;
  }

  async toJSON() {
    return await this.toObject();
  }

  async *[Symbol.iterator]() {
    const entries = await this.entries();
    yield* entries;
  }

  async *iKeys() {
    const keys = await this.keys();
    for (const key of keys) {
      yield key;
    }
  }

  async *iValues() {
    const values = await this.values();
    for (const value of values) {
      yield value;
    }
  }

  async close() {
    if (this.connection) {
      await MongoConnectionManager.closeConnection(this.uri);
      this.connection = null;
      this.KeyValue = null;
    }
  }
}

function createStore(options) {
  const { type = "mongodb" } = options;
  if (type === "mongodb") {
    return new MongoStore(options);
  }
  throw new Error(`Unsupported database type: ${type}`);
}

module.exports = { Store, MongoStore, createStore, MongoConnectionManager };