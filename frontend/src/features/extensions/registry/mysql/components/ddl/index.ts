/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { DDLOptions, DbType } from './helpers'
import {
  generateCreateTable, generateDropTable, generateAlterTable,
  generateSelect, generateInsert, generateCount,
  generateTruncate, generateDescribe,
} from './tableDdl'
import { generateShowTables, generateCreateDatabase, generateDropDatabase } from './databaseDdl'

export { type DDLOptions, type DbType } from './helpers'
export { generateCreateTable, generateDropTable, generateAlterTable, generateSelect, generateInsert, generateCount, generateTruncate, generateDescribe } from './tableDdl'
export { generateShowTables, generateCreateDatabase, generateDropDatabase } from './databaseDdl'

export function getDDLMenuItems(opts: DDLOptions): Array<{ id: string; label: string; icon: string; generator: () => string }> {
  const isSQL = opts.dbType === 'mysql' || opts.dbType === 'postgres' || opts.dbType === 'sqlite'
  const items = [
    { id: 'select', label: 'SELECT', icon: 'table', generator: () => generateSelect(opts) },
    { id: 'count', label: 'COUNT', icon: 'table', generator: () => generateCount(opts) },
    { id: 'insert', label: 'INSERT Template', icon: 'plus', generator: () => generateInsert(opts) },
    { id: 'describe', label: 'DESCRIBE', icon: 'columns', generator: () => generateDescribe(opts) },
  ]
  if (isSQL) {
    items.push(
      { id: 'create', label: 'CREATE TABLE', icon: 'plus', generator: () => generateCreateTable(opts) },
      { id: 'alter', label: 'ALTER TABLE', icon: 'edit', generator: () => generateAlterTable(opts) },
      { id: 'truncate', label: 'TRUNCATE TABLE', icon: 'trash', generator: () => generateTruncate(opts) },
      { id: 'drop', label: 'DROP TABLE', icon: 'trash', generator: () => generateDropTable(opts) },
    )
  } else {
    items.push(
      { id: 'create', label: 'Create', icon: 'plus', generator: () => generateCreateTable(opts) },
      { id: 'drop', label: 'Drop / Delete', icon: 'trash', generator: () => generateDropTable(opts) },
    )
  }
  return items
}

export function getDatabaseDDLMenuItems(dbName: string, dbType: DbType): Array<{ id: string; label: string; icon: string; generator: () => string }> {
  return [
    { id: 'show-tables', label: 'Show Tables', icon: 'table', generator: () => generateShowTables(dbName, dbType) },
    { id: 'create-db', label: 'CREATE DATABASE', icon: 'plus', generator: () => generateCreateDatabase(dbName, dbType) },
    { id: 'drop-db', label: 'DROP DATABASE', icon: 'trash', generator: () => generateDropDatabase(dbName, dbType) },
  ]
}
