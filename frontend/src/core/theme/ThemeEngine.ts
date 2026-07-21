/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { Theme } from '@core/types'
import { EventBus } from '@core/events/EventBus'
import { Events } from '@config/events'
import { BUILTIN_THEMES, type ThemeDBRow } from './themeDefinitions'
export type { ThemeDBRow } from './themeDefinitions'
export { BUILTIN_THEMES } from './themeDefinitions'

class ThemeEngineImpl {
  private themes: Map<string, Theme> = new Map()
  private currentId: string = 'dark'

  constructor() {
    this.registerTheme(BUILTIN_THEMES[0])
    this.registerTheme(BUILTIN_THEMES[1])
  }

  registerTheme(theme: Theme): void {
    this.themes.set(theme.id, theme)
  }

  loadFromDB(rows: ThemeDBRow[]): void {
    for (const row of rows) {
      this.themes.set(row.id, {
        id: row.id,
        name: row.name,
        colors: row.colors,
        components: {},
      })
    }
  }

  applyTheme(id: string): void {
    const theme = this.themes.get(id)
    if (!theme) return
    this.currentId = id
    const root = document.documentElement
    root.setAttribute('data-theme', id)
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    EventBus.emit(Events.THEME_CHANGED, { themeId: id })
  }

  getCurrentTheme(): Theme | undefined {
    return this.themes.get(this.currentId)
  }

  getCurrentId(): string { return this.currentId }
  setCurrentId(id: string): void { this.currentId = id }

  getThemes(): Theme[] {
    return Array.from(this.themes.values())
  }

  getTheme(id: string): Theme | undefined {
    return this.themes.get(id)
  }

  getThemeMode(): string {
    const theme = this.themes.get(this.currentId)
    if (theme) {
      const bg = theme.colors['--color-bg-primary'] || '#1a1a1a'
      const hex = bg.replace('#', '')
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        return luminance < 128 ? 'dark' : 'light'
      }
    }
    return 'dark'
  }
}

export const ThemeEngine = new ThemeEngineImpl()
