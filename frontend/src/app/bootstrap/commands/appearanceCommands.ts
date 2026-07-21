/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { ThemeEngine } from '@core/theme/ThemeEngine'
import { SettingsEngine } from '@core/settings/SettingsEngine'
import { useAppStore } from '@core/state/store'

export function registerAppearanceCommands(): void {
  CommandRegistry.registerCommand(
    'workbench.action.switchTheme',
    () => {
      const themes = ThemeEngine.getThemes()
      const { themeId } = useAppStore.getState()
      const idx = themes.findIndex((t) => t.id === themeId)
      const next = themes[(idx + 1) % themes.length]
      SettingsEngine.changeTheme(next.id)
    },
    { title: 'Switch Theme', category: 'Appearance' }
  )
}
