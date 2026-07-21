/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { DEFAULT_QUERY_CONTENT } from '@shared/constants/defaults'

export function registerEditorCommands(): void {
  CommandRegistry.registerCommand(
    'workbench.action.newQuery',
    () => {
      useAppStore.getState().openTab({
        title: 'New Query',
        language: 'sql',
        content: DEFAULT_QUERY_CONTENT,
        isDirty: false,
      })
    },
    { title: 'New Query Tab', keybinding: 'Ctrl+N', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.closeActiveTab',
    () => {
      const store = useAppStore.getState()
      if (store.activeTabId) store.closeTab(store.activeTabId)
    },
    { title: 'Close Active Tab', keybinding: 'Ctrl+W', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.nextTab',
    () => {
      const { tabs, activeTabId } = useAppStore.getState()
      if (tabs.length <= 1) return
      const idx = tabs.findIndex((t) => t.id === activeTabId)
      useAppStore.getState().setActiveTab(tabs[(idx + 1) % tabs.length].id)
    },
    { title: 'Next Tab', keybinding: 'Ctrl+Tab', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.previousTab',
    () => {
      const { tabs, activeTabId } = useAppStore.getState()
      if (tabs.length <= 1) return
      const idx = tabs.findIndex((t) => t.id === activeTabId)
      useAppStore.getState().setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].id)
    },
    { title: 'Previous Tab', keybinding: 'Ctrl+Shift+Tab', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.firstTab',
    () => {
      const { tabs } = useAppStore.getState()
      if (tabs.length > 0) useAppStore.getState().setActiveTab(tabs[0].id)
    },
    { title: 'First Tab', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.lastTab',
    () => {
      const { tabs } = useAppStore.getState()
      if (tabs.length > 0) useAppStore.getState().setActiveTab(tabs[tabs.length - 1].id)
    },
    { title: 'Last Tab', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'editor.action.runQuery',
    () => EventBus.emit(Events.QUERY_REFRESH),
    { title: 'Run Query', keybinding: 'F5', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'editor.action.runQueryAlt',
    () => EventBus.emit(Events.QUERY_REFRESH),
    { title: 'Run Query (Alt)', keybinding: 'Ctrl+Enter', category: 'Editor' }
  )

  CommandRegistry.registerCommand(
    'editor.action.saveTab',
    () => EventBus.emit(Events.EDITOR_SAVED),
    { title: 'Save Tab', keybinding: 'Ctrl+S', category: 'Editor' }
  )
}
