/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useMemo } from 'react'
import type { SettingDef } from '../types'
import { SettingEditor } from './SettingEditor'
import { SearchInput, CategoryGroup, EmptyState } from '../shared'

export interface GroupedSettingsEditorProps {
  settings: SettingDef[]
  table: string
  data: Record<string, string>
  onChange: (table: string, key: string, value: string) => void
}

export const GroupedSettingsEditor: React.FC<GroupedSettingsEditorProps> = ({
  settings,
  table,
  data,
  onChange,
}) => {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return settings
    const q = filter.toLowerCase()
    return settings.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        (s.group || '').toLowerCase().includes(q)
    )
  }, [settings, filter])

  const groups = useMemo(() => {
    const map = new Map<string, SettingDef[]>()
    for (const s of filtered) {
      const g = s.group || 'Other'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(s)
    }
    return map
  }, [filtered])

  return (
    <div className="sp-groups">
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Search settings…"
        className="sp-search-wrap"
        iconClassName="sp-search-icon"
        inputClassName="sp-search"
        clearClassName="sp-search-clear"
      />

      {Array.from(groups.entries()).map(([group, items]) => (
        <CategoryGroup
          key={group}
          label={group}
          count={items.length}
          className="sp-group"
          headerClassName="sp-group-header"
          labelClassName="sp-group-label"
          countClassName="sp-group-count"
        >
          <div className="sp-settings-list">
            {items.map((def) => {
              const value = data[def.key] ?? ''
              return (
                <div key={def.key} className="sp-setting-row">
                  <div className="sp-setting-info">
                    <label className="sp-setting-label">{def.label}</label>
                    <span className="sp-setting-desc">{def.description}</span>
                    <code className="sp-setting-key">{table}.{def.key}</code>
                  </div>
                  <div className="sp-setting-control">
                    <SettingEditor
                      def={def}
                      value={value}
                      onChange={(key, val) => onChange(table, key, val)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CategoryGroup>
      ))}

      {groups.size === 0 && (
        <EmptyState
          icon="search"
          message={`No settings matching "${filter}"`}
          className="sp-no-results"
        />
      )}
    </div>
  )
}
