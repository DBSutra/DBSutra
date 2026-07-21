/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { StateCreator } from 'zustand'
import type { ExtensionManifest, Theme } from '@core/types'

export interface ExtensionSlice {
  installedExtensions: ExtensionManifest[]
  activeExtensions: string[]
  registerExtension: (manifest: ExtensionManifest) => void
  activateExtension: (id: string) => void
  themeId: string
  setThemeId: (id: string) => void
  availableThemes: Theme[]
  registerTheme: (theme: Theme) => void
}

export const createExtensionSlice: StateCreator<ExtensionSlice, [], [], ExtensionSlice> = (set) => ({
  installedExtensions: [],
  activeExtensions: [],
  registerExtension: (manifest) => set((s) => ({
    installedExtensions: [...s.installedExtensions.filter((e) => e.id !== manifest.id), manifest],
  })),
  activateExtension: (id) => set((s) => ({
    activeExtensions: s.activeExtensions.includes(id)
      ? s.activeExtensions
      : [...s.activeExtensions, id],
  })),
  themeId: 'dark',
  setThemeId: (id) => set({ themeId: id }),
  availableThemes: [],
  registerTheme: (theme) => set((s) => ({
    availableThemes: [...s.availableThemes.filter((t) => t.id !== theme.id), theme],
  })),
})
