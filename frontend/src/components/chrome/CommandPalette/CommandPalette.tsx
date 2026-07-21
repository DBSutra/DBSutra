/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@core/state/store'
import { CommandRegistry } from '@core/commands/CommandRegistry'
import type { CommandDescriptor } from '@core/types'
import { Modal } from '@core/modal'
import { Icon } from '@primitives'
import './CommandPalette.css'

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [commands, setCommands] = useState<CommandDescriptor[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCommands(CommandRegistry.getCommands())
  }, [commandPaletteOpen])

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  const filtered = commands.filter(cmd =>
    !query || cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.id.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (filtered[selectedIdx]) {
        executeCommand(filtered[selectedIdx].id)
      }
    }
  }

  const executeCommand = (id: string) => {
    setCommandPaletteOpen(false)
    CommandRegistry.executeCommand(id).catch((err) => console.warn('[CommandPalette] Command failed:', id, err))
  }

  return (
    <Modal
      open={commandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      size="md"
      align="top"
      topOffset="var(--command-palette-offset, 72px)"
      className="command-palette"
    >
      <div className="cp-input-wrap">
        <Icon name="search" size={15} className="cp-search-icon" />
        <input
          ref={inputRef}
          className="cp-input"
          placeholder="Type a command..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
          onKeyDown={handleKeyDown}
        />
        <kbd className="cp-esc-hint">ESC</kbd>
      </div>
      <div className="cp-results">
        {filtered.length === 0 ? (
          <div className="cp-no-results">No commands found</div>
        ) : (
          filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`cp-result ${i === selectedIdx ? 'cp-result-selected' : ''}`}
              onMouseEnter={() => setSelectedIdx(i)}
              onClick={() => executeCommand(cmd.id)}
            >
              <div className="cp-result-content">
                <span className="cp-result-title">{cmd.title}</span>
                {cmd.category && (
                  <span className="cp-result-category">{cmd.category}</span>
                )}
              </div>
              {cmd.keybinding && (
                <kbd className="cp-keybinding">{cmd.keybinding}</kbd>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
