/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ThemeEngine imports EventBus and Events at module load time.
// We need to mock the event emission to verify it.
import { EventBus } from '@core/events/EventBus'
import { Events } from '@config/events'

import { ThemeEngine, BUILTIN_THEMES } from './ThemeEngine'

describe('ThemeEngine', () => {
  beforeEach(() => {
    // Reset to default state — re-register built-in themes
    ThemeEngine.registerTheme(BUILTIN_THEMES[0])
    ThemeEngine.registerTheme(BUILTIN_THEMES[1])
    ThemeEngine.setCurrentId('dark')
    // Clear any DOM changes from previous tests
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.removeProperty('--color-bg-primary')
    document.documentElement.style.removeProperty('--color-text-primary')
  })

  describe('built-in themes', () => {
    it('has dark and light themes registered by default', () => {
      expect(ThemeEngine.getTheme('dark')).toBeDefined()
      expect(ThemeEngine.getTheme('light')).toBeDefined()
    })

    it('exposes both themes via getThemes()', () => {
      const themes = ThemeEngine.getThemes()
      expect(themes.length).toBeGreaterThanOrEqual(2)
      const ids = themes.map((t) => t.id)
      expect(ids).toContain('dark')
      expect(ids).toContain('light')
    })

    it('exports BUILTIN_THEMES array', () => {
      expect(BUILTIN_THEMES).toHaveLength(2)
      expect(BUILTIN_THEMES[0].id).toBe('dark')
      expect(BUILTIN_THEMES[1].id).toBe('light')
    })
  })

  describe('getCurrentId() / setCurrentId()', () => {
    it('defaults to "dark"', () => {
      expect(ThemeEngine.getCurrentId()).toBe('dark')
    })

    it('changes the current theme id', () => {
      ThemeEngine.setCurrentId('light')
      expect(ThemeEngine.getCurrentId()).toBe('light')
    })
  })

  describe('getCurrentTheme()', () => {
    it('returns the current theme object', () => {
      const theme = ThemeEngine.getCurrentTheme()
      expect(theme).toBeDefined()
      expect(theme!.id).toBe('dark')
    })

    it('returns undefined if currentId points to nonexistent theme', () => {
      ThemeEngine.setCurrentId('nonexistent')
      expect(ThemeEngine.getCurrentTheme()).toBeUndefined()
    })
  })

  describe('registerTheme()', () => {
    it('registers a new custom theme', () => {
      const custom = {
        id: 'custom',
        name: 'Custom',
        colors: { '--color-bg-primary': '#ff0000' },
        components: {},
      }
      ThemeEngine.registerTheme(custom)

      expect(ThemeEngine.getTheme('custom')).toEqual(custom)
    })

    it('overwrites an existing theme with the same id', () => {
      const override = {
        id: 'dark',
        name: 'Dark Override',
        colors: { '--color-bg-primary': '#000000' },
        components: {},
      }
      ThemeEngine.registerTheme(override)

      expect(ThemeEngine.getTheme('dark')!.name).toBe('Dark Override')
    })
  })

  describe('loadFromDB()', () => {
    it('loads themes from database rows', () => {
      const rows = [
        { id: 'solarized', name: 'Solarized', colors: { '--color-bg-primary': '#002b36' }, isBuiltin: false },
        { id: 'nord', name: 'Nord', colors: { '--color-bg-primary': '#2e3440' }, isBuiltin: false },
      ]

      ThemeEngine.loadFromDB(rows)

      expect(ThemeEngine.getTheme('solarized')).toBeDefined()
      expect(ThemeEngine.getTheme('solarized')!.name).toBe('Solarized')
      expect(ThemeEngine.getTheme('nord')).toBeDefined()
    })

    it('maps rows to Theme objects with empty components', () => {
      const rows = [
        { id: 'custom', name: 'Custom', colors: { '--color-bg-primary': '#111' }, isBuiltin: false },
      ]

      ThemeEngine.loadFromDB(rows)

      const theme = ThemeEngine.getTheme('custom')
      expect(theme!.components).toEqual({})
    })
  })

  describe('applyTheme()', () => {
    it('sets data-theme attribute on document root', () => {
      ThemeEngine.applyTheme('light')

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('applies theme colors as CSS custom properties', () => {
      ThemeEngine.applyTheme('dark')

      const bgColor = document.documentElement.style.getPropertyValue('--color-bg-primary')
      expect(bgColor).toBe('#1a1a1a')
    })

    it('updates currentId to the applied theme', () => {
      ThemeEngine.applyTheme('light')
      expect(ThemeEngine.getCurrentId()).toBe('light')
    })

    it('emits THEME_CHANGED event', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit')

      ThemeEngine.applyTheme('light')

      expect(emitSpy).toHaveBeenCalledWith(Events.THEME_CHANGED, { themeId: 'light' })
      emitSpy.mockRestore()
    })

    it('does nothing for a nonexistent theme id', () => {
      const currentId = ThemeEngine.getCurrentId()
      ThemeEngine.applyTheme('nonexistent')

      // currentId should not change
      expect(ThemeEngine.getCurrentId()).toBe(currentId)
    })
  })

  describe('getThemeMode()', () => {
    it('returns "dark" for the dark theme', () => {
      ThemeEngine.setCurrentId('dark')
      expect(ThemeEngine.getThemeMode()).toBe('dark')
    })

    it('returns "light" for the light theme', () => {
      ThemeEngine.setCurrentId('light')
      expect(ThemeEngine.getThemeMode()).toBe('light')
    })

    it('returns "dark" when the current theme is not found', () => {
      ThemeEngine.setCurrentId('nonexistent')
      expect(ThemeEngine.getThemeMode()).toBe('dark')
    })

    it('returns "dark" when background color has high luminance', () => {
      // High luminance bg = light theme
      // Light bg: #fafafa => luminance > 128 => "light"
      ThemeEngine.setCurrentId('light')
      expect(ThemeEngine.getThemeMode()).toBe('light')
    })
  })
})
