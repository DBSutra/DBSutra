/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { DbType } from './helpers'

export function generateShowTables(dbName: string, dbType: DbType): string {
  switch (dbType) {
    case 'mysql': return `SHOW TABLES FROM \`${dbName}\`;`
    case 'postgres': return `SELECT table_name FROM information_schema.tables\nWHERE table_schema = 'public'\nORDER BY table_name;`
    case 'sqlite': return `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`
    case 'mongodb': return `db.getCollectionNames()`
    case 'redis': return `KEYS *`
    case 'elasticsearch': return `CAT indices`
    default: return `SHOW TABLES;`
  }
}

export function generateCreateDatabase(dbName: string, dbType: DbType): string {
  switch (dbType) {
    case 'mysql': return `CREATE DATABASE \`${dbName}\`\n  CHARACTER SET utf8mb4\n  COLLATE utf8mb4_unicode_ci;`
    case 'postgres': return `CREATE DATABASE "${dbName}"\n  WITH ENCODING = 'UTF8'\n  LC_COLLATE = 'en_US.UTF-8';`
    case 'sqlite': return `-- SQLite uses file-based databases.\n-- Create a new file: ${dbName}.db`
    case 'mongodb': return `use ${dbName}`
    case 'redis': return `SELECT 0  -- Redis databases are pre-configured (0-15)`
    case 'elasticsearch': return `PUT /${dbName}\n{\n  "settings": { "number_of_shards": 1 }\n}`
    default: return `CREATE DATABASE "${dbName}";`
  }
}

export function generateDropDatabase(dbName: string, dbType: DbType): string {
  switch (dbType) {
    case 'mysql': return `DROP DATABASE \`${dbName}\`;`
    case 'postgres': return `DROP DATABASE "${dbName}";`
    case 'sqlite': return `-- SQLite: delete the file ${dbName}.db`
    case 'mongodb': return `db.dropDatabase()`
    case 'redis': return `FLUSHDB  -- Flushes the currently selected database`
    case 'elasticsearch': return `DELETE /${dbName}`
    default: return `DROP DATABASE "${dbName}";`
  }
}
