/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { useAppStore } from '@core/state/store'
import { parseKeybinding, matchesKeybinding } from './keybindingParser'
import { isEditingContext, ALWAYS_ACTIVE_COMMANDS } from './inputDetection'

function handleKeydown(e: KeyboardEvent): void {
  const inInput = isEditingContext(e.target)
  const store = useAppStore.getState()
  const userShortcuts = store.shortcutsConfig || {}

  const commands = CommandRegistry.getCommands()
  const bindings: Array<{ id: string; binding: string; always: boolean }> = []

  for (const cmd of commands) {
    const binding = userShortcuts[cmd.id] || cmd.keybinding
    if (!binding) continue
    bindings.push({ id: cmd.id, binding, always: ALWAYS_ACTIVE_COMMANDS.has(cmd.id) })
  }

  bindings.sort((a, b) => {
    const pa = parseKeybinding(a.binding)
    const pb = parseKeybinding(b.binding)
    const scoreA = (pa.ctrl ? 4 : 0) + (pa.shift ? 2 : 0) + (pa.alt ? 1 : 0)
    const scoreB = (pb.ctrl ? 4 : 0) + (pb.shift ? 2 : 0) + (pb.alt ? 1 : 0)
    return scoreB - scoreA
  })

  for (const { id, binding, always } of bindings) {
    if (inInput && !always) continue
    if (matchesKeybinding(e, binding)) {
      e.preventDefault()
      e.stopPropagation()
      CommandRegistry.executeCommand(id).catch((err) => console.warn('[shortcuts] Command failed:', id, err))
      return
    }
  }

  if (!inInput) {
    const focusedPanel = store.focusedPanelId
    if (matchesKeybinding(e, 'Ctrl+f')) {
      e.preventDefault()
      const panelEl = document.querySelector(`[data-panel-id="${focusedPanel}"]`)
      if (panelEl) {
        const searchInput = panelEl.querySelector('input[type="text"], input[type="search"], input[placeholder*="earch"], input[placeholder*="ilter"]') as HTMLInputElement
        if (searchInput) { searchInput.focus(); searchInput.select() }
      }
    }
  }
}

export function registerKeyboardShortcuts(): void {
  window.addEventListener('keydown', handleKeydown, true)
}
