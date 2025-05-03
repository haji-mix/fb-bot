const mongoose = require("mongoose");
const { Sequelize, DataTypes } = require("sequelize");
const os = require("os");

let connectedURI = [];

class Store {
  async start() {}
  async get(key) {}
  async bulkGet(...keys) {}
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
  static schema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  });

  constructor({
    uri,
    database,
    collection,
    isOwnHost = false,
    ignoreError = false,
    allowClear = false,
    createConnection = false,
  }) {
    super();
    if (isOwnHost) {
      const hostname = os.hostname();
      this.uri = database
        ? `mongodb://${hostname}:27017/${database}`
        : `mongodb://${hostname}:27017/${uri.replace(
            /^mongodb:\/\/[^\/]+\/|\/$/,
            ""
          )}`;
    } else {
      this.uri = database ? `${uri.replace(/\/[^\/]*$/, "")}/${database}` : uri;
    }

    this.collection = collection;
    this.ignoreError = ignoreError;
    this.allowClear = allowClear;
    this.createConnection = createConnection;

    const keyValueSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true },
    });

    this.KeyValue = mongoose.model(collection, keyValueSchema);
  }

  async start(ignoreReconnect) {
    try {
      if (connectedURI.includes(this.uri)) {
        if (!ignoreReconnect) {
          throw new Error("Already connected to this database");
        }
        return;
      }

      mongoose.set("strictQuery", true);

      if (this.createConnection) {
        this.connection = mongoose.createConnection(this.uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
      } else {
        await mongoose.connect(this.uri, {
          retryWrites: true,
          w: "majority",
        });
        connectedURI.push(this.uri);
      }
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async get(key) {
    try {
      const result = await this.KeyValue.findOne({ key: String(key) });
      return result ? result.value : null;
    } catch (error) {
      if (this.ignoreError) {
        return null;
      }
      throw error;
    }
  }

  async bulkGet(...keys) {
    keys = keys.flat();
    try {
      const results = await this.KeyValue.find({ key: { $in: keys } });
      return results.map((result) => result.value);
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
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
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async bulkPut(pairs) {
    try {
      const mappedPairs = Object.entries(pairs).map(([key, value]) => ({
        updateOne: {
          filter: { key: String(key) },
          update: { key: String(key), value },
          upsert: true,
        },
      }));

      await this.KeyValue.bulkWrite(mappedPairs);
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async remove(key) {
    try {
      await this.KeyValue.deleteOne({ key: String(key) });
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async containsKey(key) {
    try {
      const count = await this.KeyValue.countDocuments({ key: String(key) });
      return count > 0;
    } catch (error) {
      if (this.ignoreError) {
        return false;
      }
      throw error;
    }
  }

  async size() {
    try {
      return await this.KeyValue.countDocuments({});
    } catch (error) {
      if (this.ignoreError) {
        return 0;
      }
      throw error;
    }
  }

  async keys() {
    try {
      const results = await this.KeyValue.find({}, "key");
      return results.map((doc) => doc.key);
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
      throw error;
    }
  }

  async values() {
    try {
      const results = await this.KeyValue.find({}, "value");
      return results.map((doc) => doc.value);
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
      throw error;
    }
  }

  async entries() {
    try {
      const results = await this.KeyValue.find({}, "key value");
      return results.map((doc) => ({ key: doc.key, value: doc.value }));
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
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
      if (!this.ignoreError) {
        throw error;
      }
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
}

// SQLStore Implementation
class SQLStore extends Store {
  constructor({
    dialect, // e.g., 'mysql', 'postgres', 'sqlite'
    uri,
    database,
    table = "KeyValuePairs",
    ignoreError = false,
    allowClear = false,
    ...connectionOptions // e.g., host, port, username, password
  }) {
    super();
    this.dialect = dialect;
    this.table = table;
    this.ignoreError = ignoreError;
    this.allowClear = allowClear;

    // Construct Sequelize connection
    this.sequelize = new Sequelize({
      dialect,
      database: database || "keyvaluedb",
      ...connectionOptions,
      ...(dialect === "sqlite" ? { storage: uri || ":memory:" } : { uri }),
      logging: false,
    });

    // Define KeyValue model
    this.KeyValue = this.sequelize.define(
      table,
      {
        key: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
        },
        value: {
          type: DataTypes.JSON, // Use JSON for flexible value storage
          allowNull: false,
        },
      },
      {
        tableName: table,
        timestamps: false,
      }
    );
  }

  async start() {
    try {
      await this.sequelize.authenticate();
      await this.KeyValue.sync(); // Create table if it doesn't exist
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async get(key) {
    try {
      const result = await this.KeyValue.findOne({ where: { key: String(key) } });
      return result ? result.value : null;
    } catch (error) {
      if (this.ignoreError) {
        return null;
      }
      throw error;
    }
  }

  async bulkGet(...keys) {
    keys = keys.flat();
    try {
      const results = await this.KeyValue.findAll({ where: { key: keys } });
      return results.map((result) => result.value);
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
      throw error;
    }
  }

  async put(key, value) {
    try {
      await this.KeyValue.upsert({ key: String(key), value });
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async bulkPut(pairs) {
    try {
      await this.sequelize.transaction(async (t) => {
        for (const [key, value] of Object.entries(pairs)) {
          await this.KeyValue.upsert(
            { key: String(key), value },
            { transaction: t }
          );
        }
      });
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async remove(key) {
    try {
      await this.KeyValue.destroy({ where: { key: String(key) } });
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
    }
  }

  async containsKey(key) {
    try {
      const count = await this.KeyValue.count({ where: { key: String(key) } });
      return count > 0;
    } catch (error) {
      if (this.ignoreError) {
        return false;
      }
      throw error;
    }
  }

  async size() {
    try {
      return await this.KeyValue.count();
    } catch (error) {
      if (this.ignoreError) {
        return 0;
      }
      throw error;
    }
  }

  async keys() {
    try {
      const results = await this.KeyValue.findAll({ attributes: ["key"] });
      return results.map((doc) => doc.key);
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
      throw error;
    }
  }

  async values() {
    try {
      const results = await this.KeyValue.findAll({ attributes: ["value"] });
      return results.map((doc) => doc.value);
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
      throw error;
    }
  }

  async entries() {
    try {
      const results = await this.KeyValue.findAll({ attributes: ["key", "value"] });
      return results.map((doc) => ({ key: doc.key, value: doc.value }));
    } catch (error) {
      if (this.ignoreError) {
        return [];
      }
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
      throw new Error("Clearing the table is not allowed.");
    }
    try {
      await this.KeyValue.destroy({ where: {}, truncate: true });
    } catch (error) {
      if (!this.ignoreError) {
        throw error;
      }
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
}

// Factory Function to Create Store
function createStore(options) {
  const { type = "mongodb" } = options;

  if (type === "mongodb") {
    return new MongoStore(options);
  } else if (["mysql", "postgres", "sqlite"].includes(type)) {
    return new SQLStore({ ...options, dialect: type });
  } else {
    throw new Error(`Unsupported database type: ${type}`);
  }
}

module.exports = { Store, MongoStore, SQLStore, createStore };