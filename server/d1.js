import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

function resultMeta(info = {}) {
  return {
    changed_db: Number(info.changes || 0) > 0,
    changes: Number(info.changes || 0),
    duration: 0,
    last_row_id: Number(info.lastInsertRowid || 0),
    rows_read: 0,
    rows_written: Number(info.changes || 0),
    size_after: 0
  };
}
class LocalD1Statement {
  constructor(database, sql, bindings = []) {
    this.database = database;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new LocalD1Statement(this.database, this.sql, bindings);
  }

  first(columnName) {
    const row = this.database.prepare(this.sql).get(...this.bindings) ?? null;
    return columnName && row ? row[columnName] ?? null : row;
  }

  all() {
    const results = this.database.prepare(this.sql).all(...this.bindings);
    return { success: true, results, meta: resultMeta() };
  }

  raw(options = {}) {
    const statement = this.database.prepare(this.sql).raw(true);
    const rows = statement.all(...this.bindings);
    if (options.columnNames !== true) return rows;
    return [statement.columns().map((column) => column.name), ...rows];
  }

  run() {
    return this.runSync();
  }

  runSync() {
    const info = this.database.prepare(this.sql).run(...this.bindings);
    return { success: true, results: [], meta: resultMeta(info) };
  }
}

export class LocalD1Database {
  constructor(filename, options = {}) {
    const resolved = path.resolve(filename);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.filename = resolved;
    this.database = new Database(resolved, {
      readonly: options.readonly === true,
      fileMustExist: options.fileMustExist === true
    });
    this.database.pragma("foreign_keys = ON");
    this.database.pragma("busy_timeout = 5000");
    if (options.readonly !== true) this.database.pragma("journal_mode = WAL");
  }

  prepare(sql) {
    return new LocalD1Statement(this.database, sql);
  }

  batch(statements) {
    const run = this.database.transaction((entries) => entries.map((statement) => statement.runSync()));
    return run(statements);
  }

  exec(sql) {
    this.database.exec(sql);
    return { count: 0, duration: 0 };
  }

  close() {
    this.database.close();
  }
}

