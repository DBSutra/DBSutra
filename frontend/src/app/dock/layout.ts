/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { LayoutData } from 'rc-dock'
import { useAppStore } from '@core/state/store'
import { SettingsEngine } from '@core/settings/SettingsEngine'
import { createDockTab } from './tabs'

/**
 * Builds the default dock layout from appearance config weights.
 * Used when no saved layout exists.
 */
export function buildDefaultLayout(appearance: Record<string, string>): LayoutData {
  const left = parseInt(appearance.layout_left_weight || '20', 10)
  const right = parseInt(appearance.layout_right_weight || '20', 10)
  const main = parseInt(appearance.layout_main_weight || '60', 10)
  const top = parseInt(appearance.layout_top_weight || '15', 10)
  const bottom = parseInt(appearance.layout_bottom_weight || '85', 10)

  return {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          size: left,
          activeId: 'connections',
          tabs: [
            createDockTab('connections')!,
            createDockTab('explorer')!,
          ],
        },
        {
          mode: 'vertical',
          size: main,
          children: [
            {
              size: top,
              activeId: 'editor',
              tabs: [createDockTab('editor')!],
            },
            {
              size: bottom,
              activeId: 'settings',
              tabs: [
                createDockTab('settings')!,
                createDockTab('results')!,
                createDockTab('eer-diagram')!,
              ],
            },
          ],
        },
        {
          size: right,
          activeId: 'history',
          tabs: [
            createDockTab('history')!,
            createDockTab('extensions')!,
            createDockTab('row-detail')!,
          ],
        },
      ],
    },
  }
}

/**
 * Debounced layout save — persists the dock layout JSON to SQLite.
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null

export function debouncedSaveLayout(layoutJson: string): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    useAppStore.getState().setDockLayout(layoutJson)
    SettingsEngine.saveDockLayout(layoutJson)
  }, 500)
}
