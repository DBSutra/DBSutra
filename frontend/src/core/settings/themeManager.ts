/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useAppStore } from '@core/state/store'
import { ThemeEngine } from '@core/theme/ThemeEngine'
import type { ThemeDBRow } from '@core/theme/ThemeEngine'
import { callGo, fireGo } from './goBridge'
import { applyAppearance, applyFonts, applyColorOverrides } from './appearanceApplier'
import { saveAppearance, saveDockLayout } from './persistSaver'
import type { AppConfig } from './SettingsEngine'

// ── Change theme ───────────────────────────────────────────────────────
export function changeTheme(config: AppConfig, themeId: string) {
  const theme = ThemeEngine.getTheme(themeId)
  if (!theme) return

  saveAppearance(config, 'theme_id', themeId)
  ThemeEngine.setCurrentId(themeId)
  useAppStore.getState().setThemeId(themeId)
  document.documentElement.setAttribute('data-theme', themeId)

  const newColors: Record<string, string> = {}
  const newAppearance: Record<string, string> = {}
  const newFonts: Record<string, string> = {}

  for (const [key, value] of Object.entries(theme.colors)) {
    if (key.startsWith('@appearance/')) {
      newAppearance[key.replace('@appearance/', '')] = value
    } else if (key.startsWith('@fonts/')) {
      newFonts[key.replace('@fonts/', '')] = value
    } else {
      newColors[key] = value
    }
  }

  config.colorOverrides = newColors
  applyColorOverrides(newColors)
  fireGo('ReplaceColorOverrides', JSON.stringify(newColors))
  useAppStore.getState().setColorOverrides(newColors)

  if (Object.keys(newAppearance).length > 0) {
    config.appearance = { ...config.appearance, ...newAppearance }
    applyAppearance(config.appearance)
    useAppStore.getState().setAppearance(config.appearance)
    for (const [k, v] of Object.entries(newAppearance)) {
      fireGo('SaveAppearance', k, v)
    }
    const hasLayout = Object.keys(newAppearance).some((k) => k.startsWith('layout_'))
    if (hasLayout) {
      useAppStore.getState().setDockLayout(null)
      saveDockLayout(config, '')
      useAppStore.getState().incrementLayoutKey()
    }
  }

  if (Object.keys(newFonts).length > 0) {
    config.fonts = { ...config.fonts, ...newFonts }
    applyFonts(config.fonts)
    useAppStore.getState().setFonts(config.fonts)
    for (const [k, v] of Object.entries(newFonts)) {
      fireGo('SaveFont', k, v)
    }
  }
}

// ── Save current config as a custom theme ──────────────────────────────
export async function saveAsTheme(config: AppConfig, name: string): Promise<string> {
  const id = `custom-${Date.now()}`
  const bundled: Record<string, string> = { ...config.colorOverrides }
  for (const [k, v] of Object.entries(config.appearance)) {
    if (k !== 'theme_id') bundled[`@appearance/${k}`] = v
  }
  for (const [k, v] of Object.entries(config.fonts)) {
    bundled[`@fonts/${k}`] = v
  }

  await callGo('SaveTheme', id, name, JSON.stringify(bundled), false)

  const newTheme: ThemeDBRow = { id, name, colors: bundled, isBuiltin: false }
  config.themes.push(newTheme)
  ThemeEngine.registerTheme({ id, name, colors: bundled, components: {} })
  useAppStore.getState().setThemes([...config.themes])

  return id
}

// ── Export theme as JSON ───────────────────────────────────────────────
export function exportTheme(themeId: string): string {
  const theme = ThemeEngine.getTheme(themeId)
  if (!theme) throw new Error('Theme not found')
  return JSON.stringify({ name: theme.name, tokens: theme.colors }, null, 2)
}

// ── Import theme from JSON ─────────────────────────────────────────────
export async function importTheme(config: AppConfig, jsonString: string): Promise<string> {
  const parsed = JSON.parse(jsonString)
  if (!parsed.name || !parsed.tokens) throw new Error('Invalid theme format')

  const id = `imported-${Date.now()}`
  await callGo('SaveTheme', id, parsed.name, JSON.stringify(parsed.tokens), false)

  const newTheme: ThemeDBRow = { id, name: parsed.name, colors: parsed.tokens, isBuiltin: false }
  config.themes.push(newTheme)
  ThemeEngine.registerTheme({ id, name: parsed.name, colors: parsed.tokens, components: {} })
  useAppStore.getState().setThemes([...config.themes])

  return id
}

// ── Delete a custom theme ──────────────────────────────────────────────
export async function deleteCustomTheme(config: AppConfig, themeId: string) {
  await callGo('DeleteTheme', themeId)
  config.themes = config.themes.filter((t) => t.id !== themeId)
  useAppStore.getState().setThemes([...config.themes])
}
