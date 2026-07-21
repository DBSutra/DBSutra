/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { StateCreator } from 'zustand'
import type { ThemeDBRow } from '@core/theme/ThemeEngine'
import { DEFAULT_SETTINGS } from '@config/defaults'

export interface SettingsSlice {
  settings: Record<string, unknown>
  getSetting: <T>(key: string) => T
  setSetting: (key: string, value: unknown) => void
  mergeSettings: (newSettings: Record<string, unknown>) => void
  appearance: Record<string, string>
  setAppearance: (data: Record<string, string>) => void
  updateAppearance: (key: string, value: string) => void
  fonts: Record<string, string>
  setFonts: (data: Record<string, string>) => void
  updateFont: (key: string, value: string) => void
  panelConfigState: Record<string, string>
  setPanelConfigState: (data: Record<string, string>) => void
  updatePanelConfig: (key: string, value: string) => void
  shortcutsConfig: Record<string, string>
  setShortcuts: (data: Record<string, string>) => void
  updateShortcut: (commandId: string, keybinding: string) => void
  colorOverrides: Record<string, string>
  setColorOverrides: (data: Record<string, string>) => void
  updateColorOverride: (token: string, value: string) => void
  themesDB: ThemeDBRow[]
  setThemes: (data: ThemeDBRow[]) => void
}

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  getSetting: <T>(key: string) => (get().settings[key] as T) ?? (DEFAULT_SETTINGS[key] as T),
  setSetting: (key, value) => set((s) => ({
    settings: { ...s.settings, [key]: value },
  })),
  mergeSettings: (newSettings) => set((s) => ({
    settings: { ...s.settings, ...newSettings },
  })),
  appearance: {},
  setAppearance: (data) => set({ appearance: data }),
  updateAppearance: (key, value) => set((s) => ({
    appearance: { ...s.appearance, [key]: value },
  })),
  fonts: {},
  setFonts: (data) => set({ fonts: data }),
  updateFont: (key, value) => set((s) => ({
    fonts: { ...s.fonts, [key]: value },
  })),
  panelConfigState: {},
  setPanelConfigState: (data) => set({ panelConfigState: data }),
  updatePanelConfig: (key, value) => set((s) => ({
    panelConfigState: { ...s.panelConfigState, [key]: value },
  })),
  shortcutsConfig: {},
  setShortcuts: (data) => set({ shortcutsConfig: data }),
  updateShortcut: (commandId, keybinding) => set((s) => ({
    shortcutsConfig: { ...s.shortcutsConfig, [commandId]: keybinding },
  })),
  colorOverrides: {},
  setColorOverrides: (data) => set({ colorOverrides: data }),
  updateColorOverride: (token, value) => set((s) => ({
    colorOverrides: { ...s.colorOverrides, [token]: value },
  })),
  themesDB: [],
  setThemes: (data) => set({ themesDB: data }),
})
