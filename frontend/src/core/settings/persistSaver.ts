/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { ThemeEngine } from '@core/theme/ThemeEngine'
import { DEBOUNCE_DELAY_LAYOUT } from '@config/commands'
import { callGo, fireGo, debouncedSave } from './goBridge'
import type { AppConfig } from './SettingsEngine'

// ── Save a single appearance key ───────────────────────────────────────
export function saveAppearance(config: AppConfig, key: string, value: string) {
  config.appearance[key] = value
  debouncedSave(`appearance:${key}`, () => callGo('SaveAppearance', key, value) as Promise<void>)
}

// ── Save a single font key ────────────────────────────────────────────
export function saveFont(config: AppConfig, key: string, value: string) {
  config.fonts[key] = value
  debouncedSave(`fonts:${key}`, () => callGo('SaveFont', key, value) as Promise<void>)
}

// ── Save a single panel config key ────────────────────────────────────
export function savePanelConfig(config: AppConfig, key: string, value: string) {
  config.panelConfig[key] = value
  debouncedSave(`panel:${key}`, () => callGo('SavePanelConfig', key, value) as Promise<void>)
}

// ── Save dock layout ──────────────────────────────────────────────────
export function saveDockLayout(config: AppConfig, payload: string) {
  config.dockLayout = payload
  debouncedSave('dockLayout', () => callGo('SaveDockLayout', payload) as Promise<void>, DEBOUNCE_DELAY_LAYOUT)
}

// ── Save a shortcut ───────────────────────────────────────────────────
export function saveShortcut(config: AppConfig, commandId: string, keybinding: string) {
  config.shortcuts[commandId] = keybinding
  debouncedSave(`shortcut:${commandId}`, () => callGo('SaveShortcut', commandId, keybinding) as Promise<void>)
}

// ── Save a color override ─────────────────────────────────────────────
export function saveColorOverride(config: AppConfig, token: string, value: string) {
  config.colorOverrides[token] = value
  document.documentElement.style.setProperty(token, value)
  debouncedSave(`color:${token}`, () => callGo('SaveColorOverride', token, value) as Promise<void>)
}

// ── Remove a color override ───────────────────────────────────────────
export function removeColorOverride(config: AppConfig, token: string) {
  const themeId = config.appearance.theme_id || 'dark'
  const theme = ThemeEngine.getTheme(themeId)
  const defaultValue = theme?.colors[token]

  if (defaultValue) {
    config.colorOverrides[token] = defaultValue
    document.documentElement.style.setProperty(token, defaultValue)
    fireGo('SaveColorOverride', token, defaultValue)
  } else {
    delete config.colorOverrides[token]
    document.documentElement.style.removeProperty(token)
    callGo('DeleteColorOverride', token).catch((err) => console.warn('[persistSaver] DeleteColorOverride failed:', err))
  }
}
