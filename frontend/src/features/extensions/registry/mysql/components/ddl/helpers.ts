/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { SchemaColumn } from '@core/types'

export type DbType = 'mysql' | 'postgres' | 'mongodb' | 'sqlite' | 'redis' | 'elasticsearch'

export interface DDLOptions {
  table: { name: string; columns: SchemaColumn[] }
  dbName: string
  dbType: DbType
}

export function quote(name: string, dbType: DbType): string {
  switch (dbType) {
    case 'mysql': return `\`${name}\``
    case 'postgres': return `"${name}"`
    case 'sqlite': return `"${name}"`
    default: return name
  }
}

export function columnDef(col: SchemaColumn, dbType: DbType): string {
  const parts: string[] = [quote(col.name, dbType), col.type.toUpperCase()]
  if (!col.nullable) parts.push('NOT NULL')
  if (col.key === 'PRI') parts.push('PRIMARY KEY')
  return parts.join(' ')
}

export function qualifiedTableName(dbName: string, tableName: string, dbType: DbType): string {
  return `${quote(dbName, dbType)}.${quote(tableName, dbType)}`
}
