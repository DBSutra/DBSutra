/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useAppStore } from '@core/state/store'
import { ThemeEngine, BUILTIN_THEMES } from '@core/theme/ThemeEngine'
import type { ThemeDBRow } from '@core/theme/ThemeEngine'
import {
  DEFAULT_APPEARANCE,
  DEFAULT_FONTS,
  DEFAULT_PANEL_CONFIG,
} from '@config/defaults'
import { callGo, fireGo } from './goBridge'
import {
  applyAppearance,
  applyFonts,
  applyColorOverrides,
  applyPanelConfig,
} from './appearanceApplier'
import {
  saveAppearance as persistAppearance,
  saveFont as persistFont,
  savePanelConfig as persistPanel,
  saveDockLayout as persistDockLayout,
  saveShortcut as persistShortcut,
  saveColorOverride as persistColorOverride,
  removeColorOverride as persistRemoveColorOverride,
} from './persistSaver'
import {
  changeTheme as doChangeTheme,
  saveAsTheme as doSaveAsTheme,
  exportTheme as doExportTheme,
  importTheme as doImportTheme,
  deleteCustomTheme as doDeleteCustomTheme,
} from './themeManager'

export interface AppConfig {
  appearance: Record<string, string>
  fonts: Record<string, string>
  panelConfig: Record<string, string>
  dockLayout: string
  shortcuts: Record<string, string>
  colorOverrides: Record<string, string>
  themes: ThemeDBRow[]
}

class SettingsEngineImpl {
  private _loaded = false
  private _config: AppConfig = {
    appearance: {},
    fonts: {},
    panelConfig: {},
    dockLayout: '',
    shortcuts: {},
    colorOverrides: {},
    themes: [],
  }

  get config(): AppConfig { return this._config }
  get loaded(): boolean { return this._loaded }

  // ── Load all config from SQLite ──────────────────────────────────────
  async loadAll(): Promise<AppConfig> {
    try {
      const json = await callGo<string>('LoadAllConfig')
      if (json) {
        const parsed = JSON.parse(json) as AppConfig
        this._config = {
          appearance: { ...DEFAULT_APPEARANCE, ...parsed.appearance },
          fonts: { ...DEFAULT_FONTS, ...parsed.fonts },
          panelConfig: { ...DEFAULT_PANEL_CONFIG, ...parsed.panelConfig },
          dockLayout: parsed.dockLayout || '',
          shortcuts: parsed.shortcuts || {},
          colorOverrides: parsed.colorOverrides || {},
          themes: parsed.themes || [],
        }
      } else {
        this._config = this._buildDefaultConfig()
      }
    } catch {
      this._config = this._buildDefaultConfig()
    }

    this._seedThemes()
    this._seedColorOverrides()
    this._seedDefaultsOnFirstBoot()

    this._loaded = true
    return this._config
  }

  // ── Apply all config at once ─────────────────────────────────────────
  applyAll(config: AppConfig) {
    applyAppearance(config.appearance)
    applyColorOverrides(config.colorOverrides)
    applyFonts(config.fonts)
    applyPanelConfig(config.panelConfig)

    const store = useAppStore.getState()
    store.setAppearance(config.appearance)
    store.setFonts(config.fonts)
    store.setPanelConfigState(config.panelConfig)
    store.setShortcuts(config.shortcuts)
    store.setColorOverrides(config.colorOverrides)
    store.setThemes(config.themes)
  }

  // ── Delegated persist methods ────────────────────────────────────────
  saveAppearance(key: string, value: string) { persistAppearance(this._config, key, value) }
  saveFont(key: string, value: string) { persistFont(this._config, key, value) }
  savePanelConfig(key: string, value: string) { persistPanel(this._config, key, value) }
  saveDockLayout(payload: string) { persistDockLayout(this._config, payload) }
  saveShortcut(commandId: string, keybinding: string) { persistShortcut(this._config, commandId, keybinding) }
  saveColorOverride(token: string, value: string) { persistColorOverride(this._config, token, value) }
  removeColorOverride(token: string) { persistRemoveColorOverride(this._config, token) }

  // ── Delegated apply methods ──────────────────────────────────────────
  applyAppearance(appearance: Record<string, string>) { applyAppearance(appearance) }
  applyFonts(fonts: Record<string, string>) { applyFonts(fonts) }
  applyPanelConfig(config: Record<string, string>) { applyPanelConfig(config) }

  // ── Delegated theme methods ──────────────────────────────────────────
  changeTheme(themeId: string) { doChangeTheme(this._config, themeId) }
  async saveAsTheme(name: string) { return doSaveAsTheme(this._config, name) }
  exportTheme(themeId: string) { return doExportTheme(themeId) }
  async importTheme(json: string) { return doImportTheme(this._config, json) }
  async deleteCustomTheme(id: string) { return doDeleteCustomTheme(this._config, id) }

  // ── Private helpers ──────────────────────────────────────────────────
  private _buildDefaultConfig(): AppConfig {
    return {
      appearance: { ...DEFAULT_APPEARANCE },
      fonts: { ...DEFAULT_FONTS },
      panelConfig: { ...DEFAULT_PANEL_CONFIG },
      dockLayout: '',
      shortcuts: {},
      colorOverrides: {},
      themes: [],
    }
  }

  private _seedThemes() {
    if (this._config.themes.length === 0) {
      for (const theme of BUILTIN_THEMES) {
        fireGo('SaveTheme', theme.id, theme.name, JSON.stringify(theme.colors), true)
      }
      this._config.themes = BUILTIN_THEMES.map((t: { id: string; name: string; colors: Record<string, string> }) => ({
        id: t.id, name: t.name, colors: { ...t.colors }, isBuiltin: true,
      }))
    }
    ThemeEngine.loadFromDB(this._config.themes)
  }

  private _seedColorOverrides() {
    const themeId = this._config.appearance.theme_id || 'dark'
    const currentTheme = ThemeEngine.getTheme(themeId)
    if (!currentTheme) return

    const themeColors = currentTheme.colors
    const merged = { ...themeColors, ...this._config.colorOverrides }
    const missing: Record<string, string> = {}
    for (const [k, v] of Object.entries(themeColors)) {
      if (!(k in this._config.colorOverrides)) missing[k] = v
    }
    if (Object.keys(missing).length > 0) {
      fireGo('SeedColorOverrides', JSON.stringify(missing))
    }
    this._config.colorOverrides = merged
  }

  private _seedDefaultsOnFirstBoot() {
    const hasAppearance = Object.keys(this._config.appearance).length > Object.keys(DEFAULT_APPEARANCE).length
    if (!hasAppearance) {
      for (const [key, value] of Object.entries(DEFAULT_APPEARANCE)) fireGo('SaveAppearance', key, value)
      for (const [key, value] of Object.entries(DEFAULT_FONTS)) fireGo('SaveFont', key, value)
      for (const [key, value] of Object.entries(DEFAULT_PANEL_CONFIG)) fireGo('SavePanelConfig', key, value)
    }
  }
}

export const SettingsEngine = new SettingsEngineImpl()
