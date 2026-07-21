/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { useAppStore } from '@core/state/store'
import { SettingsEngine } from '@core/settings/SettingsEngine'
import { EventBus, Events } from '@core/events/EventBus'

export function registerPanelCommands(): void {
  CommandRegistry.registerCommand(
    'workbench.action.toggleActivityBar',
    () => {
      const store = useAppStore.getState()
      const next = store.panelConfigState.activity_bar_visible === 'false' ? 'true' : 'false'
      store.updatePanelConfig('activity_bar_visible', next)
      SettingsEngine.savePanelConfig('activity_bar_visible', next)
    },
    { title: 'Toggle Activity Bar', keybinding: 'Ctrl+Shift+A', category: 'Panels' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.toggleStatusBar',
    () => {
      const store = useAppStore.getState()
      const next = store.panelConfigState.status_bar_visible === 'false' ? 'true' : 'false'
      store.updatePanelConfig('status_bar_visible', next)
      SettingsEngine.savePanelConfig('status_bar_visible', next)
    },
    { title: 'Toggle Status Bar', category: 'Panels' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.toggleSidebar',
    () => {
      const store = useAppStore.getState()
      const next = store.panelConfigState.activity_bar_visible === 'false' ? 'true' : 'false'
      store.updatePanelConfig('activity_bar_visible', next)
      SettingsEngine.savePanelConfig('activity_bar_visible', next)
    },
    { title: 'Toggle Sidebar', keybinding: 'Ctrl+B', category: 'Panels' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.toggleFocusRing',
    () => {
      const store = useAppStore.getState()
      const next = store.panelConfigState.focus_ring_enabled === 'false' ? 'true' : 'false'
      store.updatePanelConfig('focus_ring_enabled', next)
      SettingsEngine.savePanelConfig('focus_ring_enabled', next)
    },
    { title: 'Toggle Focus Ring', category: 'Panels' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.maximizePanel',
    () => {
      const { focusedPanelId, activePanelId } = useAppStore.getState()
      const focused = focusedPanelId || activePanelId
      if (focused) EventBus.emit(Events.FOCUS_PANEL, `maximize:${focused}`)
    },
    { title: 'Maximize Focused Panel', keybinding: 'Ctrl+Shift+M', category: 'Panels' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.minimizePanel',
    () => EventBus.emit(Events.FOCUS_PANEL, 'minimize'),
    { title: 'Restore Panel Size', keybinding: 'Ctrl+Shift+M', category: 'Panels' }
  )
}
