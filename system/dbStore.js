const mongoose = require("mongoose");
const { Schema } = mongoose;

const DataTypes = {
  String: { type: String, validate: v => typeof v === 'string' },
  Number: { type: Number, validate: v => typeof v === 'number' && !isNaN(v) },
  Boolean: { type: Boolean, validate: v => typeof v === 'boolean' },
  Date: { type: Date, validate: v => v instanceof Date && !isNaN(v.getTime()) },
  Object: { type: Schema.Types.Mixed, validate: v => v !== null && typeof v === 'object' },
  Array: { type: [Schema.Types.Mixed], validate: v => Array.isArray(v) }
};

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
        maxPoolSize: options.maxPoolSize || 10,
        serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
        ...options,
      }).asPromise();


      connection.on('error', (err) => console.error(`MongoDB connection error: ${err}`));
      connection.on('disconnected', () => console.warn(`MongoDB disconnected: ${uri}`));

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
    await Promise.all(
      Array.from(this.connections.entries()).map(([uri, connection]) =>
        connection.close().then(() => this.connections.delete(uri))
      )
    );
  }
}

class Store {
  async start() {}
  async get(key) {}
  async put(key, value, options) {}
  async bulkPut(pairs, options) {}
  async remove(key) {}
  async delete(key) {}
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
    schemaOptions = {},
    ttl = null, // Time-to-live in seconds
    maxValueSize = 16 * 1024 * 1024, // 16MB default
  }) {
    super();
    this.uri = database ? `${uri.replace(/\/[^\/]*$/, "")}/${database}` : uri;
    this.collectionName = collection;
    this.ignoreError = ignoreError;
    this.allowClear = allowClear;
    this.maxValueSize = maxValueSize;
    this.connection = null;
    this.KeyValue = null;
    
    this.schemaOptions = {
      dataType: 'Mixed', 
      indexes: [], 
      ...schemaOptions
    };
    
    this.ttl = ttl;
  }

  async start() {
    try {
      this.connection = await MongoConnectionManager.getConnection(this.uri);

      const keyValueSchema = new Schema({
        key: { 
          type: String, 
          required: true, 
          unique: true,
          index: true 
        },
        value: { 
          type: DataTypes[this.schemaOptions.dataType] || Schema.Types.Mixed,
          required: true,
          validate: {
            validator: v => Buffer.byteLength(JSON.stringify(v)) <= this.maxValueSize,
            message: `Value exceeds maximum size of ${this.maxValueSize} bytes`
          }
        },
        version: { 
          type: Number, 
          default: 0 
        },
        createdAt: { 
          type: Date, 
          default: Date.now 
        },
        updatedAt: { 
          type: Date, 
          default: Date.now 
        },
        expiresAt: { 
          type: Date,
          index: { expiresAfterSeconds: 0 }
        }
      }, {
        timestamps: true,
        collection: this.collectionName
      });

      if (this.ttl) {
        keyValueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      }

      this.schemaOptions.indexes.forEach(index => {
        keyValueSchema.index(index.fields, index.options);
      });

      this.KeyValue = this.connection.model(this.collectionName, keyValueSchema);
      
      await this.KeyValue.createIndexes();
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
      const result = await this.KeyValue.findOne({ key: String(key) }).lean();
      return result ? result.value : null;
    } catch (error) {
      if (this.ignoreError) return null;
      throw error;
    }
  }

  async put(key, value, options = {}) {
    const { session, ttl } = options;
    try {
      if (Buffer.byteLength(JSON.stringify(value)) > this.maxValueSize) {
        throw new Error(`Value size exceeds ${this.maxValueSize} bytes`);
      }

      const update = {
        key: String(key),
        value,
        $inc: { version: 1 },
        expiresAt: ttl ? new Date(Date.now() + ttl * 1000) : undefined
      };

      const doc = await this.KeyValue.findOneAndUpdate(
        { key: String(key) },
        update,
        { 
          upsert: true, 
          new: true, 
          setDefaultsOnInsert: true,
          session 
        }
      ).lean();
      
      return doc;
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async bulkPut(pairs, options = {}) {
    const { session } = options;
    try {
      const operations = Object.entries(pairs).map(([key, value]) => {
        if (Buffer.byteLength(JSON.stringify(value)) > this.maxValueSize) {
          throw new Error(`Value size for key ${key} exceeds ${this.maxValueSize} bytes`);
        }
        return {
          updateOne: {
            filter: { key: String(key) },
            update: { 
              key: String(key), 
              value,
              $inc: { version: 1 }
            },
            upsert: true,
          }
        };
      });
      
      await this.KeyValue.bulkWrite(operations, { session });
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

  async delete(key) {
    try {
      await this.remove(key);
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async containsKey(key) {
    try {
      return await this.KeyValue.exists({ key: String(key) });
    } catch (error) {
      if (this.ignoreError) return false;
      throw error;
    }
  }

  async size() {
    try {
      return await this.KeyValue.estimatedDocumentCount();
    } catch (error) {
      if (this.ignoreError) return 0;
      throw error;
    }
  }

  async keys(options = {}) {
    const { limit = 1000, skip = 0 } = options;
    try {
      const results = await this.KeyValue
        .find({}, "key")
        .limit(limit)
        .skip(skip)
        .lean();
      return results.map(doc => doc.key);
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async values(options = {}) {
    const { limit = 1000, skip = 0 } = options;
    try {
      const results = await this.KeyValue
        .find({}, "value")
        .limit(limit)
        .skip(skip)
        .lean();
      return results.map(doc => doc.value);
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async entries(options = {}) {
    const { limit = 1000, skip = 0 } = options;
    try {
      const results = await this.KeyValue
        .find({}, "key value")
        .limit(limit)
        .skip(skip)
        .lean();
      return results.map(doc => ({ key: doc.key, value: doc.value }));
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async withTransaction(callback) {
    const session = await this.connection.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  async preProc(data) {
    return data;
  }

  async load(options = {}) {
    const entries = await this.entries(options);
    const result = Object.fromEntries(
      entries.map(({ key, value }) => [key, value])
    );
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
    return await this.load();
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
    yield* keys;
  }

  async *iValues() {
    const values = await this.values();
    yield* values;
  }

  async close() {
    if (this.connection) {
      await MongoConnectionManager.closeConnection(this.uri);
      this.connection = null;
      this.KeyValue = null;
    }
  }
  async getMetadata(key) {
    try {
      const doc = await this.KeyValue
        .findOne({ key: String(key) }, 'version createdAt updatedAt')
        .lean();
      return doc ? {
        version: doc.version,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      } : null;
    } catch (error) {
      if (this.ignoreError) return null;
      throw error;
    }
  }

  async findByValue(query) {
    try {
      const results = await this.KeyValue
        .find({ value: query })
        .lean();
      return results.map(doc => ({ key: doc.key, value: doc.value }));
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
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

module.exports = { Store, MongoStore, createStore, MongoConnectionManager, DataTypes };