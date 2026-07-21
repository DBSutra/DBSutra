/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { DDLOptions } from './helpers'
import { quote, columnDef, qualifiedTableName } from './helpers'

export function generateCreateTable(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') return `// Create collection "${table.name}"\ndb.createCollection("${table.name}")`
  if (dbType === 'redis') return `// Redis does not use tables.\n// Keys are created with SET, HSET, LPUSH, SADD, etc.\nSET ${table.name}:example "value"`
  if (dbType === 'elasticsearch') return `// Create index "${table.name}"\nPUT /${table.name}\n{\n  "settings": {\n    "number_of_shards": 1,\n    "number_of_replicas": 0\n  },\n  "mappings": {\n    "properties": {\n      "name": { "type": "text" },\n      "created_at": { "type": "date" }\n    }\n  }\n}`
  const cols = table.columns.map((c) => `  ${columnDef(c, dbType)}`).join(',\n')
  return `CREATE TABLE ${qualifiedTableName(dbName, table.name, dbType)} (\n${cols}\n);`
}

export function generateDropTable(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') return `// Drop collection "${table.name}"\ndb.${table.name}.drop()`
  if (dbType === 'redis') return `// Delete all keys matching pattern\ndel ${table.name}:*`
  if (dbType === 'elasticsearch') return `// Delete index "${table.name}"\nDELETE /${table.name}`
  return `DROP TABLE ${qualifiedTableName(dbName, table.name, dbType)};`
}

export function generateAlterTable(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') return `// MongoDB uses schema-less design.\n// Add a new field by inserting a document with it:\ndb.${table.name}.insertOne({ new_field: "value" })\n\n// Or add validation rules:\ndb.runCommand({\n  collMod: "${table.name}",\n  validator: { $jsonSchema: { /* schema */ } }\n})`
  if (dbType === 'redis') return `// Redis does not have ALTER TABLE.\n// Modify data directly with SET, HSET, etc.`
  if (dbType === 'elasticsearch') return `// Add a new field mapping\nPUT /${table.name}/_mapping\n{\n  "properties": {\n    "new_field": { "type": "text" }\n  }\n}`
  const qualified = qualifiedTableName(dbName, table.name, dbType)
  return `-- Add a new column\nALTER TABLE ${qualified}\n  ADD COLUMN new_column VARCHAR(255);\n\n-- Modify an existing column\n-- ALTER TABLE ${qualified}\n--   MODIFY COLUMN existing_column TEXT NOT NULL;\n\n-- Drop a column\n-- ALTER TABLE ${qualified}\n--   DROP COLUMN column_name;`
}

export function generateSelect(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') return `db.${table.name}.find({}).limit(100)`
  if (dbType === 'redis') return `KEYS ${table.name}:*`
  if (dbType === 'elasticsearch') return `SEARCH ${table.name} {"query":{"match_all":{}},"size":100}`
  return `SELECT *\nFROM ${qualifiedTableName(dbName, table.name, dbType)}\nLIMIT 100;`
}

export function generateInsert(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') {
    const sample: Record<string, unknown> = {}
    table.columns.forEach((c) => { if (c.key !== 'PRI') { if (c.type.includes('int')) sample[c.name] = 0; else if (c.type.includes('bool')) sample[c.name] = false; else sample[c.name] = '' } })
    return `db.${table.name}.insertOne(${JSON.stringify(sample, null, 2)})`
  }
  if (dbType === 'redis') return `SET ${table.name}:key "value"`
  if (dbType === 'elasticsearch') return `INDEX ${table.name} {"name": "example"}`
  const cols = table.columns.filter((c) => c.key !== 'PRI')
  const colNames = cols.map((c) => quote(c.name, dbType)).join(', ')
  const placeholders = cols.map((_, i) => dbType === 'postgres' ? `$${i + 1}` : '?').join(', ')
  return `INSERT INTO ${qualifiedTableName(dbName, table.name, dbType)} (${colNames})\nVALUES (${placeholders});`
}

export function generateCount(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') return `db.${table.name}.countDocuments({})`
  if (dbType === 'redis') return `DBSIZE`
  if (dbType === 'elasticsearch') return `COUNT ${table.name}`
  return `SELECT COUNT(*) FROM ${qualifiedTableName(dbName, table.name, dbType)};`
}

export function generateTruncate(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') return `db.${table.name}.deleteMany({})`
  if (dbType === 'redis') return `FLUSHDB`
  if (dbType === 'elasticsearch') return `DELETE /${table.name}/_query\n{"query":{"match_all":{}}}`
  return `TRUNCATE TABLE ${qualifiedTableName(dbName, table.name, dbType)};`
}

export function generateDescribe(opts: DDLOptions): string {
  const { table, dbName, dbType } = opts
  if (dbType === 'mongodb') return `db.${table.name}.findOne()`
  if (dbType === 'redis') return `TYPE ${table.name}:key`
  if (dbType === 'elasticsearch') return `MAPPING ${table.name}`
  if (dbType === 'postgres') return `SELECT column_name, data_type, is_nullable, column_default\nFROM information_schema.columns\nWHERE table_schema = '${dbName}'\n  AND table_name = '${table.name}'\nORDER BY ordinal_position;`
  if (dbType === 'sqlite') return `PRAGMA table_info("${table.name}");`
  return `DESCRIBE \`${dbName}\`.\`${table.name}\`;`
}
