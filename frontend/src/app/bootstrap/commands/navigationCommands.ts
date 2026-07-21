/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { PANEL_ORDER, PANEL_LABELS } from '@config/commands'

function focusNextPanel(direction: 'left' | 'right' | 'up' | 'down') {
  const store = useAppStore.getState()
  const current = store.focusedPanelId || 'editor'
  const idx = PANEL_ORDER.indexOf(current)
  if (idx === -1) {
    store.setFocusedPanelId(PANEL_ORDER[0])
    EventBus.emit(Events.FOCUS_PANEL, PANEL_ORDER[0])
    return
  }

  let nextIdx: number
  switch (direction) {
    case 'right': nextIdx = Math.min(idx + 1, PANEL_ORDER.length - 1); break
    case 'left': nextIdx = Math.max(idx - 1, 0); break
    case 'down': nextIdx = Math.min(idx + 3, PANEL_ORDER.length - 1); break
    case 'up': nextIdx = Math.max(idx - 3, 0); break
  }

  const nextId = PANEL_ORDER[nextIdx]
  store.setFocusedPanelId(nextId)
  EventBus.emit(Events.FOCUS_PANEL, nextId)
}

function switchTabInFocusedPanel(direction: 'next' | 'prev' | 'first' | 'last') {
  const { tabs, activeTabId } = useAppStore.getState()
  if (tabs.length === 0) return

  let targetId: string | null = null
  switch (direction) {
    case 'next': { const idx = tabs.findIndex((t) => t.id === activeTabId); targetId = tabs[(idx + 1) % tabs.length].id; break }
    case 'prev': { const idx = tabs.findIndex((t) => t.id === activeTabId); targetId = tabs[(idx - 1 + tabs.length) % tabs.length].id; break }
    case 'first': targetId = tabs[0].id; break
    case 'last': targetId = tabs[tabs.length - 1].id; break
  }
  if (targetId) useAppStore.getState().setActiveTab(targetId)
}

export function registerNavigationCommands(): void {
  // Panel focus (Ctrl+1 through Ctrl+9)
  PANEL_ORDER.forEach((id, i) => {
    CommandRegistry.registerCommand(
      `workbench.action.focusPanel.${id}`,
      () => {
        useAppStore.getState().setFocusedPanelId(id)
        EventBus.emit(Events.FOCUS_PANEL, id)
      },
      { title: `Focus ${PANEL_LABELS[id] || id}`, keybinding: `Ctrl+${i + 1}`, category: 'Navigation' }
    )
  })

  // Panel navigation
  CommandRegistry.registerCommand('workbench.action.focusNextPanelRight', () => focusNextPanel('right'), { title: 'Focus Next Panel (Right)', keybinding: 'Ctrl+Opt+ArrowRight', category: 'Navigation' })
  CommandRegistry.registerCommand('workbench.action.focusNextPanelLeft', () => focusNextPanel('left'), { title: 'Focus Previous Panel (Left)', keybinding: 'Ctrl+Opt+ArrowLeft', category: 'Navigation' })
  CommandRegistry.registerCommand('workbench.action.focusNextPanelDown', () => focusNextPanel('down'), { title: 'Focus Panel Below', keybinding: 'Ctrl+Opt+ArrowDown', category: 'Navigation' })
  CommandRegistry.registerCommand('workbench.action.focusNextPanelUp', () => focusNextPanel('up'), { title: 'Focus Panel Above', keybinding: 'Ctrl+Opt+ArrowUp', category: 'Navigation' })

  // Tab navigation within panel
  CommandRegistry.registerCommand('workbench.action.nextTabInPanel', () => switchTabInFocusedPanel('next'), { title: 'Next Tab in Panel', keybinding: 'Ctrl+Opt+.', category: 'Navigation' })
  CommandRegistry.registerCommand('workbench.action.previousTabInPanel', () => switchTabInFocusedPanel('prev'), { title: 'Previous Tab in Panel', keybinding: 'Ctrl+Opt+,', category: 'Navigation' })
  CommandRegistry.registerCommand('workbench.action.firstTabInPanel', () => switchTabInFocusedPanel('first'), { title: 'First Tab in Panel', keybinding: 'Ctrl+Opt+Shift+,', category: 'Navigation' })
  CommandRegistry.registerCommand('workbench.action.lastTabInPanel', () => switchTabInFocusedPanel('last'), { title: 'Last Tab in Panel', keybinding: 'Ctrl+Opt+Shift+.', category: 'Navigation' })
}
