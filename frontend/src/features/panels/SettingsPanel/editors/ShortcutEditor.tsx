/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Icon } from '@primitives'
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { SearchInput, CategoryGroup, EmptyState } from '../shared'

function formatKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey) parts.push('Cmd')
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const key = e.key
  if (!['Meta', 'Control', 'Alt', 'Shift'].includes(key)) {
    parts.push(key.length === 1 ? key.toUpperCase() : key)
  }
  return parts.length > 1 || (parts.length === 1 && !['Meta','Control','Alt','Shift'].includes(key)) ? parts.join('+') : ''
}

interface ShortcutRowProps {
  commandId: string
  title: string
  currentBinding: string
  onSave: (commandId: string, keybinding: string) => void
  onClear: (commandId: string) => void
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ commandId, title, currentBinding, onSave, onClear }) => {
  const [recording, setRecording] = useState(false)
  const [captured, setCaptured] = useState('')
  const inputRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!recording) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(false)
        setCaptured('')
        return
      }
      const formatted = formatKeyEvent(e)
      if (formatted) setCaptured(formatted)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [recording])

  const handleStartRecord = () => {
    setCaptured('')
    setRecording(true)
    inputRef.current?.focus()
  }

  const handleConfirm = () => {
    if (captured) onSave(commandId, captured)
    setRecording(false)
    setCaptured('')
  }

  const handleCancel = () => {
    setRecording(false)
    setCaptured('')
  }

  return (
    <div className={`sc-row ${recording ? 'sc-row-recording' : ''}`}>
      <div className="sc-info">
        <span className="sc-title">{title}</span>
      </div>
      <div className="sc-binding-area">
        {recording ? (
          <>
            <button ref={inputRef} className="sc-capture-btn active" onBlur={handleCancel} autoFocus>
              {captured || <span className="sc-hint">Press keys…</span>}
            </button>
            {captured && (
              <button className="sc-confirm-btn" onMouseDown={handleConfirm} title="Save">
                <Icon name="check" size={13} />
              </button>
            )}
            <button className="sc-cancel-btn" onMouseDown={handleCancel} title="Cancel">
              <Icon name="x" size={13} />
            </button>
          </>
        ) : (
          <>
            {currentBinding ? (
              <kbd className="sc-kbd">{currentBinding}</kbd>
            ) : (
              <span className="sc-unbound">—</span>
            )}
            <button className="sc-record-btn" onClick={handleStartRecord} title="Click and press keys to record shortcut">
              <Icon name="keyboard" size={13} />
            </button>
            {currentBinding && (
              <button className="sc-clear-btn" onClick={() => onClear(commandId)} title="Clear shortcut">
                <Icon name="x" size={12} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export interface ShortcutEditorProps {
  shortcuts: Record<string, string>
  onSave: (commandId: string, keybinding: string) => void
  onClear: (commandId: string) => void
}

export const ShortcutEditor: React.FC<ShortcutEditorProps> = ({ shortcuts, onSave, onClear }) => {
  const commands = CommandRegistry.getCommands()
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return commands
    const q = filter.toLowerCase()
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q) ||
      (cmd.category || '').toLowerCase().includes(q)
    )
  }, [commands, filter])

  const categories = useMemo(() => {
    const map = new Map<string, typeof commands>()
    for (const cmd of filtered) {
      const cat = cmd.category || 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(cmd)
    }
    return map
  }, [filtered])

  return (
    <div className="sc-editor-wrap">
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Search shortcuts…"
        className="sc-filter"
        iconClassName="sc-filter-icon"
        inputClassName="sc-filter-input"
        clearClassName="sc-filter-clear"
      />

      {Array.from(categories.entries()).map(([category, cmds]) => (
        <CategoryGroup
          key={category}
          label={category}
          count={cmds.length}
          className="sc-category-group"
          headerClassName="sc-category-header"
          labelClassName="sc-category-label"
          countClassName="sc-category-count"
        >
          <div className="sc-editor">
            {cmds.map((cmd) => (
              <ShortcutRow
                key={cmd.id}
                commandId={cmd.id}
                title={cmd.title}
                currentBinding={shortcuts[cmd.id] || cmd.keybinding || ''}
                onSave={onSave}
                onClear={onClear}
              />
            ))}
          </div>
        </CategoryGroup>
      ))}

      {categories.size === 0 && (
        <EmptyState
          icon="search"
          message={`No shortcuts matching "${filter}"`}
          className="sc-no-results"
        />
      )}
    </div>
  )
}
