/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionContextAPI } from '@core/extensions'
import coreManifest from './manifest.json'

export const manifest = coreManifest

export function activate(ctx: ExtensionContextAPI): void {
  console.info('[core] Core extension activating...')

  // Register core commands
  const commands = [
    'workbench.action.toggleSidebar',
    'workbench.action.togglePanel',
    'workbench.action.toggleActivityBar',
    'workbench.action.toggleStatusBar',
    'workbench.action.commandPalette',
    'workbench.action.settings',
    'workbench.action.openConnections',
    'workbench.action.openHistory',
    'workbench.action.newQuery',
    'workbench.action.closeTab',
    'workbench.action.nextTab',
    'workbench.action.prevTab',
    'editor.action.runQuery',
    'editor.action.saveTab',
    'workbench.action.focusPanel.1',
    'workbench.action.focusPanel.2',
    'workbench.action.focusPanel.3',
    'workbench.action.focusPanel.4',
    'workbench.action.focusPanel.5',
    'workbench.action.focusNextPanel',
    'workbench.action.focusPrevPanel',
    'workbench.action.maximizePanel',
    'workbench.action.minimizePanel',
    'workbench.action.toggleTheme',
  ]

  for (const cmd of commands) {
    ctx.registerCommand(cmd, () => {
      console.debug(`[core] Command executed: ${cmd}`)
      // Actual handlers will be connected in integration step
    })
  }

  console.info(`[core] Registered ${commands.length} commands`)
}
