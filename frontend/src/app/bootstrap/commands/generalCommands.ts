/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'

export function registerGeneralCommands(): void {
  CommandRegistry.registerCommand(
    'workbench.action.showCommands',
    () => {
      const store = useAppStore.getState()
      store.setCommandPaletteOpen(!store.commandPaletteOpen)
    },
    { title: 'Toggle Command Palette', keybinding: 'Ctrl+Shift+P', category: 'General' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.openSettings',
    () => EventBus.emit(Events.FOCUS_PANEL, 'settings'),
    { title: 'Open Settings', keybinding: 'Ctrl+,', category: 'General' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.openConnections',
    () => EventBus.emit(Events.FOCUS_PANEL, 'connections'),
    { title: 'Open Connections', category: 'General' }
  )

  CommandRegistry.registerCommand(
    'workbench.action.openHistory',
    () => EventBus.emit(Events.FOCUS_PANEL, 'history'),
    { title: 'Open History', category: 'General' }
  )
}
