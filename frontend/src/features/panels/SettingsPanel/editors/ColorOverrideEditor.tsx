/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useMemo } from 'react'
import { Icon } from '@primitives'
import { SearchInput, CategoryGroup, EmptyState } from '../shared'

function categorizeColorToken(key: string): string {
  const k = key.toLowerCase()
  if (k.includes('shadow')) return 'Shadows'
  if (k.includes('activitybar')) return 'Activity Bar'
  if (k.includes('sidebar')) return 'Sidebar'
  if (k.includes('statusbar')) return 'Status Bar'
  if (k.includes('tab-active') || k.includes('tab-hover') || k.includes('tab-bg') || k.includes('tab-border') || k.includes('tabbar') || k.includes('tab-inactive')) return 'Tabs'
  if (k.includes('editor')) return 'Editor'
  if (k.includes('scrollbar')) return 'Scrollbar'
  if (k.includes('border')) return 'Borders'
  if (k.includes('bg-')) return 'Backgrounds'
  if (k.includes('text-')) return 'Text'
  if (k.includes('accent')) return 'Accent'
  if (k.includes('success') || k.includes('error') || k.includes('warning') || k.includes('info') || k.includes('danger')) return 'Status'
  if (k.includes('db-')) return 'Database'
  if (k.includes('null') || k.includes('pk-')) return 'Semantic'
  return 'Other'
}

function colorTokenLabel(key: string): string {
  return key
    .replace(/^--color-/, '')
    .replace(/^--/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export interface ColorOverrideEditorProps {
  data: Record<string, string>
  onUpdate: (key: string, value: string) => void
  onRemove: (key: string) => void
}

export const ColorOverrideEditor: React.FC<ColorOverrideEditorProps> = ({ data, onUpdate, onRemove }) => {
  const [filter, setFilter] = useState('')

  const entries = useMemo(() => Object.entries(data), [data])

  const filtered = useMemo(() => {
    if (!filter) return entries
    const q = filter.toLowerCase()
    return entries.filter(([key, value]) =>
      key.toLowerCase().includes(q) || value.toLowerCase().includes(q)
    )
  }, [entries, filter])

  const categories = useMemo(() => {
    const map = new Map<string, Array<[string, string]>>()
    for (const entry of filtered) {
      const cat = categorizeColorToken(entry[0])
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(entry)
    }
    return map
  }, [filtered])

  return (
    <div className="co-editor-wrap">
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Search colors…"
        className="co-filter"
        iconClassName="co-filter-icon"
        inputClassName="co-filter-input"
        clearClassName="co-filter-clear"
      />

      {Array.from(categories.entries()).map(([category, items]) => (
        <CategoryGroup
          key={category}
          label={category}
          count={items.length}
          className="co-category-group"
          headerClassName="co-category-header"
          labelClassName="co-category-label"
          countClassName="co-category-count"
        >
          <div className="co-list">
            {items.map(([key, value]) => (
              <div key={key} className="co-row">
                <div className="co-row-info">
                  <div className="co-row-preview" style={{ backgroundColor: value }} />
                  <div className="co-row-text">
                    <span className="co-row-label">{colorTokenLabel(key)}</span>
                    <code className="co-row-key">{key}</code>
                  </div>
                </div>
                <div className="co-row-control">
                  <input type="color" className="se-color-picker" value={value || '#000000'} onChange={(e) => onUpdate(key, e.target.value)} />
                  <input type="text" className="se-color-text" value={value} onChange={(e) => onUpdate(key, e.target.value)} />
                  <button className="se-kv-remove" onClick={() => onRemove(key)} title="Remove override">
                    <Icon name="x" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CategoryGroup>
      ))}

      {categories.size === 0 && (
        <EmptyState
          icon="paintbrush"
          message={filter ? `No colors matching "${filter}"` : 'No color overrides yet'}
          className="co-no-results"
        />
      )}
    </div>
  )
}
