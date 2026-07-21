/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
  type Completion,
} from '@codemirror/autocomplete'
import { useAppStore } from '@core/state/store'

// ─── SQL Keywords ────────────────────────────────────────────────────────────
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
  'ALTER', 'DROP', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'FULL', 'ON',
  'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'ALL', 'DISTINCT', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
  'VARCHAR', 'INTEGER', 'TEXT', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'FLOAT', 'DECIMAL',
  'NOT', 'NULL', 'DEFAULT', 'AUTO_INCREMENT', 'SERIAL', 'BIGSERIAL',
  'TRUE', 'FALSE', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'IF', 'IFNULL',
  'NOW', 'CURRENT_TIMESTAMP', 'CAST', 'CONVERT', 'TRIM', 'UPPER', 'LOWER',
  'SUBSTRING', 'LENGTH', 'REPLACE', 'CONCAT',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
  'GRANT', 'REVOKE', 'PRIVILEGES',
  'EXPLAIN', 'ANALYZE', 'DESCRIBE', 'SHOW', 'USE',
]

// ─── SQL Completion Source ───────────────────────────────────────────────────
function sqlCompletionSource(context: CompletionContext): CompletionResult | null {
  const store = useAppStore.getState()
  const activeTab = store.tabs.find(t => t.id === store.activeTabId)
  if (!activeTab?.connectionId) return null

  const schemas = store.schemaCache[activeTab.connectionId]
  if (!schemas) return null

  // Get the word being typed
  const word = context.matchBefore(/[\w.]*/)
  if (!word && !context.explicit) return null

  const prefix = word?.text.toLowerCase() || ''
  const from = word?.from ?? context.pos

  const options: Completion[] = []

  // SQL Keywords
  for (const kw of SQL_KEYWORDS) {
    if (!prefix || kw.toLowerCase().startsWith(prefix)) {
      options.push({
        label: kw,
        type: 'keyword',
        boost: 1,
      })
    }
  }

  // Databases, Tables, Columns from schema cache
  for (const db of schemas) {
    // Database name
    if (!prefix || db.name.toLowerCase().startsWith(prefix)) {
      options.push({
        label: db.name,
        type: 'namespace',
        detail: 'Database',
        boost: 2,
      })
    }

    for (const table of db.tables) {
      // Table name
      if (!prefix || table.name.toLowerCase().startsWith(prefix)) {
        options.push({
          label: table.name,
          type: 'type',
          detail: `Table (${db.name})`,
          boost: 3,
        })
      }

      // Also add as db.table
      const qualifiedTable = `${db.name}.${table.name}`
      if (!prefix || qualifiedTable.toLowerCase().startsWith(prefix)) {
        options.push({
          label: qualifiedTable,
          type: 'type',
          detail: 'Table',
          boost: 3,
        })
      }

      // Columns
      for (const col of table.columns) {
        if (!prefix || col.name.toLowerCase().startsWith(prefix)) {
          options.push({
            label: col.name,
            type: 'property',
            detail: `${col.type} (${table.name})`,
            boost: 4,
          })
        }
      }
    }
  }

  // Deduplicate by label
  const seen = new Set<string>()
  const deduped: Completion[] = []
  for (const opt of options) {
    if (!seen.has(opt.label)) {
      seen.add(opt.label)
      deduped.push(opt)
    }
  }

  return {
    from,
    options: deduped,
    validFor: /^[\w.]*$/,
  }
}

/**
 * Creates SQL language support with autocomplete.
 * Includes schema-aware completions (databases, tables, columns).
 */
export function sqlAutocompletion() {
  return autocompletion({
    override: [sqlCompletionSource],
    activateOnTyping: true,
    maxRenderedOptions: 50,
  })
}
