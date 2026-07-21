/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { create } from 'zustand'
import type { LayoutSlice } from './slices/layoutSlice'
import type { TabSlice } from './slices/tabSlice'
import type { ConnectionSlice } from './slices/connectionSlice'
import type { SettingsSlice } from './slices/settingsSlice'
import type { UISlice } from './slices/uiSlice'
import type { ExtensionSlice } from './slices/extensionSlice'
import type { PreferencesSlice } from './slices/preferencesSlice'
import { createLayoutSlice } from './slices/layoutSlice'
import { createTabSlice } from './slices/tabSlice'
import { createConnectionSlice } from './slices/connectionSlice'
import { createSettingsSlice } from './slices/settingsSlice'
import { createUISlice } from './slices/uiSlice'
import { createExtensionSlice } from './slices/extensionSlice'
import { createPreferencesSlice } from './slices/preferencesSlice'
import { DEBOUNCE_DELAY_LAYOUT } from '@config/commands'
import { Set as SetState } from '@bindings/clientdb/stateservice'

export type AppState = LayoutSlice & TabSlice & ConnectionSlice & SettingsSlice & UISlice & ExtensionSlice & PreferencesSlice

export const useAppStore = create<AppState>()((...args) => ({
  ...createLayoutSlice(...args),
  ...createTabSlice(...args),
  ...createConnectionSlice(...args),
  ...createSettingsSlice(...args),
  ...createUISlice(...args),
  ...createExtensionSlice(...args),
  ...createPreferencesSlice(...args),
}))

// ── Persist tabs on change ──────────────────────────────────────────
let saveTabsTimer: ReturnType<typeof setTimeout> | null = null

useAppStore.subscribe((state, prevState) => {
  if (state.tabs !== prevState.tabs || state.activeTabId !== prevState.activeTabId) {
    if (saveTabsTimer) clearTimeout(saveTabsTimer)
    saveTabsTimer = setTimeout(() => {
      const tabCount = state.tabs.length
      const activeId = state.activeTabId
      console.debug(`[store] Persisting ${tabCount} tab(s), activeTab=${activeId}`)
      const payload = JSON.stringify({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      })
      SetState('editor.tabs', payload)
        .then(() => console.debug(`[store] Tabs persisted OK (${payload.length} bytes)`))
        .catch((err) => {
          console.error('[store] Failed to persist tabs:', {
            tabCount,
            activeId,
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          })
        })
    }, DEBOUNCE_DELAY_LAYOUT)
  }
})
