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

// ─── MongoDB-specific completions ────────────────────────────────────────────
const MONGO_METHODS: Completion[] = [
  { label: 'find', type: 'function', detail: 'method', info: 'Find documents matching a filter' },
  { label: 'findOne', type: 'function', detail: 'method', info: 'Find a single document' },
  { label: 'find({}).limit()', type: 'function', detail: 'method', info: 'Find with limit' },
  { label: 'find({}).sort()', type: 'function', detail: 'method', info: 'Find with sort' },
  { label: 'insertOne', type: 'function', detail: 'method', info: 'Insert a single document' },
  { label: 'insertMany', type: 'function', detail: 'method', info: 'Insert multiple documents' },
  { label: 'updateOne', type: 'function', detail: 'method', info: 'Update a single document' },
  { label: 'updateMany', type: 'function', detail: 'method', info: 'Update multiple documents' },
  { label: 'deleteOne', type: 'function', detail: 'method', info: 'Delete a single document' },
  { label: 'deleteMany', type: 'function', detail: 'method', info: 'Delete multiple documents' },
  { label: 'countDocuments', type: 'function', detail: 'method', info: 'Count documents matching filter' },
  { label: 'aggregate', type: 'function', detail: 'method', info: 'Aggregation pipeline' },
  { label: 'distinct', type: 'function', detail: 'method', info: 'Get distinct values' },
  { label: 'createIndex', type: 'function', detail: 'method', info: 'Create an index' },
  { label: 'dropIndex', type: 'function', detail: 'method', info: 'Drop an index' },
  { label: 'drop', type: 'function', detail: 'method', info: 'Drop the collection' },
  { label: 'rename', type: 'function', detail: 'method', info: 'Rename the collection' },
]

const MONGO_OPERATORS: Completion[] = [
  { label: '$eq', type: 'keyword', detail: 'operator', info: 'Equal' },
  { label: '$ne', type: 'keyword', detail: 'operator', info: 'Not equal' },
  { label: '$gt', type: 'keyword', detail: 'operator', info: 'Greater than' },
  { label: '$gte', type: 'keyword', detail: 'operator', info: 'Greater than or equal' },
  { label: '$lt', type: 'keyword', detail: 'operator', info: 'Less than' },
  { label: '$lte', type: 'keyword', detail: 'operator', info: 'Less than or equal' },
  { label: '$in', type: 'keyword', detail: 'operator', info: 'In array' },
  { label: '$nin', type: 'keyword', detail: 'operator', info: 'Not in array' },
  { label: '$regex', type: 'keyword', detail: 'operator', info: 'Regular expression' },
  { label: '$exists', type: 'keyword', detail: 'operator', info: 'Field exists' },
  { label: '$type', type: 'keyword', detail: 'operator', info: 'BSON type' },
  { label: '$and', type: 'keyword', detail: 'operator', info: 'Logical AND' },
  { label: '$or', type: 'keyword', detail: 'operator', info: 'Logical OR' },
  { label: '$not', type: 'keyword', detail: 'operator', info: 'Logical NOT' },
  { label: '$set', type: 'keyword', detail: 'update', info: 'Set field value' },
  { label: '$unset', type: 'keyword', detail: 'update', info: 'Remove field' },
  { label: '$inc', type: 'keyword', detail: 'update', info: 'Increment value' },
  { label: '$push', type: 'keyword', detail: 'update', info: 'Push to array' },
  { label: '$pull', type: 'keyword', detail: 'update', info: 'Pull from array' },
  { label: '$addToSet', type: 'keyword', detail: 'update', info: 'Add to set (no dups)' },
]

const MONGO_TOP_LEVEL: Completion[] = [
  { label: 'db', type: 'variable', detail: 'database', info: 'Current database reference' },
  { label: 'use', type: 'keyword', detail: 'command', info: 'Switch database' },
  { label: 'show', type: 'keyword', detail: 'command', info: 'Show dbs/collections' },
]

// ─── MongoDB Completion Source ───────────────────────────────────────────────
function mongoCompletionSource(context: CompletionContext): CompletionResult | null {
  const store = useAppStore.getState()
  const activeTab = store.tabs.find(t => t.id === store.activeTabId)
  if (!activeTab?.connectionId) return null

  const schemas = store.schemaCache[activeTab.connectionId]
  if (!schemas) return null

  const word = context.matchBefore(/[\w$.]*/)
  if (!word && !context.explicit) return null

  const prefix = word?.text.toLowerCase() || ''
  const from = word?.from ?? context.pos
  const options: Completion[] = []

  // Check context: after 'db.' → show collection names + methods
  const line = context.state.doc.lineAt(context.pos)
  const lineTextBefore = line.text.slice(0, context.pos - line.from)

  if (lineTextBefore.includes('db.')) {
    // After 'db.' → suggest collections and methods
    for (const db of schemas) {
      for (const table of db.tables) {
        const name = table.name
        if (!prefix || name.toLowerCase().startsWith(prefix)) {
          options.push({
            label: name,
            type: 'type',
            detail: 'Collection',
            boost: 5,
          })
        }
      }
    }

    // MongoDB methods
    for (const method of MONGO_METHODS) {
      if (!prefix || method.label.toLowerCase().startsWith(prefix)) {
        options.push(method)
      }
    }
  } else if (lineTextBefore.includes('$')) {
    // After '$' → suggest operators
    for (const op of MONGO_OPERATORS) {
      if (!prefix || op.label.toLowerCase().startsWith(prefix)) {
        options.push(op)
      }
    }
  } else {
    // Top-level: db, use, show, collection names
    for (const item of MONGO_TOP_LEVEL) {
      if (!prefix || item.label.toLowerCase().startsWith(prefix)) {
        options.push(item)
      }
    }

    // Also suggest collection names at top level
    for (const db of schemas) {
      for (const table of db.tables) {
        if (!prefix || table.name.toLowerCase().startsWith(prefix)) {
          options.push({
            label: table.name,
            type: 'type',
            detail: `Collection (${db.name})`,
            boost: 3,
          })
        }
      }
    }
  }

  // Deduplicate
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
    validFor: /^[\w$.]*$/,
  }
}

/**
 * Creates JavaScript language support with MongoDB autocomplete.
 */
export function jsAutocompletion() {
  return autocompletion({
    override: [mongoCompletionSource],
    activateOnTyping: true,
    maxRenderedOptions: 50,
  })
}
