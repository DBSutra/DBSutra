/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { StateCreator } from 'zustand'
import type { UserPreferences } from '@config/preferences'
import { DEFAULT_PREFERENCES } from '@config/preferences'

export interface PreferencesSlice {
  preferences: UserPreferences
  setPreference: <K extends keyof UserPreferences>(
    category: K,
    key: keyof UserPreferences[K],
    value: UserPreferences[K][keyof UserPreferences[K]]
  ) => void
  resetPreferences: () => void
  resetCategory: (category: keyof UserPreferences) => void
}

export const createPreferencesSlice: StateCreator<PreferencesSlice, [], [], PreferencesSlice> = (set) => ({
  preferences: { ...DEFAULT_PREFERENCES },

  setPreference: (category, key, value) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: {
          ...state.preferences[category],
          [key]: value,
        },
      },
    }))
  },

  resetPreferences: () => {
    set({ preferences: { ...DEFAULT_PREFERENCES } })
  },

  resetCategory: (category) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: { ...DEFAULT_PREFERENCES[category] },
      },
    }))
  },
})
