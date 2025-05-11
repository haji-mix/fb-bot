/**
 * MongoDB Store Implementation
 * 
 * @author Original Author: Liane Cagara
 * @modifier Kenneth Panio (i love you liane! : >)
 * @description A MongoDB-based key-value store implementation with connection management.
 * @license MIT
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Manages MongoDB connections to prevent duplicate connections and handle connection lifecycle.
 */
class MongoConnectionManager {
  static connections = new Map();

  /**
   * Retrieves or creates a MongoDB connection for the given URI.
   * @param {string} uri - MongoDB connection URI.
   * @param {Object} [options={}] - Mongoose connection options.
   * @returns {Promise<mongoose.Connection>} The MongoDB connection.
   * @throws {Error} If connection fails.
   */
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

  /**
   * Closes a MongoDB connection for the given URI.
   * @param {string} uri - MongoDB connection URI.
   */
  static async closeConnection(uri) {
    if (this.connections.has(uri)) {
      const connection = this.connections.get(uri);
      await connection.close();
      this.connections.delete(uri);
    }
  }

  /**
   * Closes all active MongoDB connections.
   */
  static async closeAllConnections() {
    for (const [uri, connection] of this.connections) {
      await connection.close();
      this.connections.delete(uri);
    }
  }
}

/**
 * Abstract base class for key-value store implementations.
 */
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

/**
 * MongoDB-based key-value store implementation.
 * @extends Store
 */
class MongoStore extends Store {
  /**
   * Creates a new MongoStore instance.
   * @param {Object} options - Configuration options.
   * @param {string} options.uri - MongoDB connection URI.
   * @param {string} [options.database] - Database name.
   * @param {string} options.collection - Collection name.
   * @param {boolean} [options.ignoreError=false] - Ignore errors if true.
   * @param {boolean} [options.allowClear=false] - Allow clearing the collection if true.
   */
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

  /**
   * Initializes the MongoDB connection and schema.
   * @throws {Error} If connection or schema setup fails and ignoreError is false.
   */
  async start() {
    try {
      this.connection = await MongoConnectionManager.getConnection(this.uri);
      const keyValueSchema = new mongoose.Schema({
        key: { type: String, required: true, unique: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
      });
      this.KeyValue = this.connection.model(this.collectionName, keyValueSchema);
    } catch (error) {
      if (this.ignoreError) {
        console.error(`MongoStore start error (ignored): ${error.message}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Retrieves a value by key.
   * @param {string} key - The key to query.
   * @returns {Promise<any|null>} The value or null if not found.
   */
  async get(key) {
    try {
      const result = await this.KeyValue.findOne({ key: String(key) });
      return result ? result.value : null;
    } catch (error) {
      if (this.ignoreError) return null;
      throw error;
    }
  }

  /**
   * Stores a key-value pair.
   * @param {string} key - The key.
   * @param {any} value - The value.
   */
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

  /**
   * Stores multiple key-value pairs in bulk.
   * @param {Object} pairs - Object containing key-value pairs.
   */
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

  /**
   * Removes a key-value pair.
   * @param {string} key - The key to remove.
   */
  async remove(key) {
    try {
      await this.KeyValue.deleteOne({ key: String(key) });
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  /**
   * Checks if a key exists.
   * @param {string} key - The key to check.
   * @returns {Promise<boolean>} True if the key exists, false otherwise.
   */
  async containsKey(key) {
    try {
      const count = await this.KeyValue.countDocuments({ key: String(key) });
      return count > 0;
    } catch (error) {
      if (this.ignoreError) return false;
      throw error;
    }
  }

  /**
   * Gets the total number of key-value pairs.
   * @returns {Promise<number>} The number of documents.
   */
  async size() {
    try {
      return await this.KeyValue.countDocuments();
    } catch (error) {
      if (this.ignoreError) return 0;
      throw error;
    }
  }

  /**
   * Retrieves all keys.
   * @returns {Promise<string[]>} Array of keys.
   */
  async keys() {
    try {
      const results = await this.KeyValue.find({}, "key");
      return results.map((doc) => doc.key);
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  /**
   * Retrieves all values.
   * @returns {Promise<any[]>} Array of values.
   */
  async values() {
    try {
      const results = await this.KeyValue.find({}, "value");
      return results.map((doc) => doc.value);
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  /**
   * Retrieves all key-value pairs.
   * @returns {Promise<{key: string, value: any}[]>} Array of key-value objects.
   */
  async entries() {
    try {
      const results = await this.KeyValue.find({}, "key value");
      return results.map((doc) => ({ key: doc.key, value: doc.value }));
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  /**
   * Pre-processes data before loading.
   * @param {Object} data - The data to process.
   * @returns {Promise<Object>} The processed data.
   */
  async preProc(data) {
    return data;
  }

  /**
   * Loads all key-value pairs into an object.
   * @returns {Promise<Object>} The loaded data.
   */
  async load() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return await this.preProc(result);
  }

  /**
   * Clears the collection if allowed.
   * @throws {Error} If clearing is not allowed.
   */
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

  /**
   * Converts the store to an object.
   * @returns {Promise<Object>} The store as an object.
   */
  async toObject() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return result;
  }

  /**
   * Converts the store to JSON.
   * @returns {Promise<Object>} The store as JSON.
   */
  async toJSON() {
    return await this.toObject();
  }

  /**
   * Iterates over key-value pairs.
   * @yields {{key: string, value: any}} Key-value pair.
   */
  async *[Symbol.iterator]() {
    const entries = await this.entries();
    yield* entries;
  }

  /**
   * Iterates over keys.
   * @yields {string} Key.
   */
  async *iKeys() {
    const keys = await this.keys();
    for (const key of keys) {
      yield key;
    }
  }

  /**
   * Iterates over values.
   * @yields {any} Value.
   */
  async *iValues() {
    const values = await this.values();
    for (const value of values) {
      yield value;
    }
  }

  /**
   * Closes the MongoDB connection.
   */
  async close() {
    if (this.connection) {
      await MongoConnectionManager.closeConnection(this.uri);
      this.connection = null;
      this.KeyValue = null;
    }
  }
}

/**
 * Factory function to create a store instance.
 * @param {Object} options - Configuration options.
 * @param {string} [options.type="mongodb"] - Store type.
 * @returns {Store} The store instance.
 * @throws {Error} If the store type is unsupported.
 */
function createStore(options) {
  const { type = "mongodb" } = options;
  if (type === "mongodb") {
    return new MongoStore(options);
  }
  throw new Error(`Unsupported database type: ${type}`);
}

module.exports = { Store, MongoStore, createStore, MongoConnectionManager };