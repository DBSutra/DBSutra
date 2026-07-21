/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// ── Schema Types ─────────────────────────────────────────────────────
export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
  key?: string
}

export interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

export interface SchemaDatabase {
  name: string
  tables: SchemaTable[]
}

// ── Query Result Types ───────────────────────────────────────────────
export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  rowsAffected: number
  error?: string
  executionTime?: number
}
