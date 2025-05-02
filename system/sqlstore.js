const sqlite3 = require("sqlite3").verbose();

class SQLStore {
  constructor({
    dbPath = ":memory:",
    table = "keyvalue",
    ignoreError = false,
    allowClear = false,
  }) {
    this.dbPath = dbPath;
    this.table = table;
    this.ignoreError = ignoreError;
    this.allowClear = allowClear;
    this.db = null;
  }

  async start() {
    try {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err && !this.ignoreError) throw err;
      });

      await this.run(
        `CREATE TABLE IF NOT EXISTS ${this.table} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`
      );
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this);
      });
    });
  }

  async getOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  async getAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  async put(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.run(
        `INSERT OR REPLACE INTO ${this.table} (key, value) VALUES (?, ?)`,
        [String(key), serializedValue]
      );
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async bulkPut(pairs) {
    try {
      const placeholders = Object.entries(pairs)
        .map(() => `(?, ?)`)
        .join(",");
      const values = Object.entries(pairs).flatMap(([key, value]) => [
        String(key),
        JSON.stringify(value),
      ]);
      await this.run(
        `INSERT OR REPLACE INTO ${this.table} (key, value) VALUES ${placeholders}`,
        values
      );
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async get(key) {
    try {
      const row = await this.getOne(
        `SELECT value FROM ${this.table} WHERE key = ?`,
        [String(key)]
      );
      return row ? JSON.parse(row.value) : null;
    } catch (error) {
      if (this.ignoreError) return null;
      throw error;
    }
  }

  async bulkGet(...keys) {
    keys = keys.flat();
    try {
      const placeholders = keys.map(() => "?").join(",");
      const rows = await this.getAll(
        `SELECT value FROM ${this.table} WHERE key IN (${placeholders})`,
        keys.map(String)
      );
      return rows.map((row) => JSON.parse(row.value));
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async remove(key) {
    try {
      await this.run(`DELETE FROM ${this.table} WHERE key = ?`, [String(key)]);
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async containsKey(key) {
    try {
      const row = await this.getOne(
        `SELECT 1 FROM ${this.table} WHERE key = ?`,
        [String(key)]
      );
      return !!row;
    } catch (error) {
      if (this.ignoreError) return false;
      throw error;
    }
  }

  async size() {
    try {
      const row = await this.getOne(
        `SELECT COUNT(*) as count FROM ${this.table}`
      );
      return row.count;
    } catch (error) {
      if (this.ignoreError) return 0;
      throw error;
    }
  }

  async keys() {
    try {
      const rows = await this.getAll(`SELECT key FROM ${this.table}`);
      return rows.map((row) => row.key);
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async values() {
    try {
      const rows = await this.getAll(`SELECT value FROM ${this.table}`);
      return rows.map((row) => JSON.parse(row.value));
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async entries() {
    try {
      const rows = await this.getAll(`SELECT key, value FROM ${this.table}`);
      return rows.map((row) => ({
        key: row.key,
        value: JSON.parse(row.value),
      }));
    } catch (error) {
      if (this.ignoreError) return [];
      throw error;
    }
  }

  async clear() {
    if (!this.allowClear) {
      throw new Error("Clearing the table is not allowed.");
    }
    try {
      await this.run(`DELETE FROM ${this.table}`);
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
  }

  async toObject() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      result[key] = value;
    }
    return result;
  }

  async toJSON() {
    return await this.toObject();
  }

  async close() {
    try {
      await new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (error) {
      if (!this.ignoreError) throw error;
    }
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

module.exports = { SQLStore };
