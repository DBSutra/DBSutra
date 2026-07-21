/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useAppStore } from '@core/state/store'
import { ThemeEngine } from '@core/theme/ThemeEngine'
import {
  DEFAULT_APPEARANCE,
  DEFAULT_FONTS,
  DEFAULT_PANEL_CONFIG,
} from '@config/defaults'

// ── Apply appearance settings as CSS variables ─────────────────────────
export function applyAppearance(appearance: Record<string, string>) {
  const root = document.documentElement
  const a = { ...DEFAULT_APPEARANCE, ...appearance }

  root.style.setProperty('--panel-radius', a.panel_radius + 'px')
  root.style.setProperty('--panel-gap', a.panel_gap + 'px')
  root.style.setProperty('--divider-size', a.divider_size + 'px')
  root.style.setProperty('--border-width', a.border_width + 'px')
  root.style.setProperty('--activitybar-width', a.activity_bar_width + 'px')
  root.style.setProperty('--tabbar-height', a.tabbar_height + 'px')
  root.style.setProperty('--tab-height', (a.tab_height || '32') + 'px')
  root.style.setProperty('--tab-padding-left', (a.tab_padding_left || '10') + 'px')
  root.style.setProperty('--tab-padding-right', (a.tab_padding_right || '28') + 'px')
  root.style.setProperty('--statusbar-height', a.statusbar_height + 'px')
  root.style.setProperty('--scrollbar-width', (a.scrollbar_width || '6') + 'px')
  root.style.setProperty('--radius-xs', (a.radius_xs || '2') + 'px')
  root.style.setProperty('--radius-sm', a.radius_sm + 'px')
  root.style.setProperty('--radius-md', a.radius_md + 'px')
  root.style.setProperty('--radius-lg', a.radius_lg + 'px')
  root.style.setProperty('--radius-xl', (a.radius_xl || '12') + 'px')
  root.style.setProperty('--radius-full', a.radius_full + 'px')
  root.style.setProperty('--transition-fast', (a.transition_fast || '80') + 'ms ease')
  root.style.setProperty('--transition-normal', (a.transition_normal || '150') + 'ms ease')
  root.style.setProperty('--transition_slow', (a.transition_slow || '300') + 'ms ease')
  root.style.setProperty('--space-1', (a.spacing_1 || '2') + 'px')
  root.style.setProperty('--space-2', (a.spacing_2 || '4') + 'px')
  root.style.setProperty('--space-3', (a.spacing_3 || '6') + 'px')
  root.style.setProperty('--space-4', (a.spacing_4 || '8') + 'px')
  root.style.setProperty('--space-5', (a.spacing_5 || '10') + 'px')
  root.style.setProperty('--space-6', (a.spacing_6 || '12') + 'px')
  root.style.setProperty('--space-7', (a.spacing_7 || '14') + 'px')
  root.style.setProperty('--space-8', (a.spacing_8 || '16') + 'px')
  root.style.setProperty('--space-10', (a.spacing_10 || '20') + 'px')
  root.style.setProperty('--space-12', (a.spacing_12 || '24') + 'px')
  root.style.setProperty('--space-16', (a.spacing_16 || '32') + 'px')

  if (a.theme_id) {
    ThemeEngine.setCurrentId(a.theme_id)
    useAppStore.getState().setThemeId(a.theme_id)
    root.setAttribute('data-theme', a.theme_id)
  }
}

// ── Apply font settings ───────────────────────────────────────────────
export function applyFonts(fonts: Record<string, string>) {
  const root = document.documentElement
  const f = { ...DEFAULT_FONTS, ...fonts }

  root.style.setProperty('--font-sans', f.ui_family)
  root.style.setProperty('--text-xs', f.ui_size_xs + 'px')
  root.style.setProperty('--text-sm', f.ui_size_sm + 'px')
  root.style.setProperty('--text-base', f.ui_size + 'px')
  root.style.setProperty('--text-md', f.ui_size_md + 'px')
  root.style.setProperty('--text-lg', f.ui_size_lg + 'px')
  root.style.setProperty('--font-mono', f.mono_family)

  const store = useAppStore.getState()
  store.setSetting('editor.fontFamily', f.editor_family)
  store.setSetting('editor.fontSize', parseInt(f.editor_size) || 14)
}

// ── Apply color overrides as CSS variables ─────────────────────────────
export function applyColorOverrides(overrides: Record<string, string>) {
  const root = document.documentElement
  for (const [token, value] of Object.entries(overrides)) {
    root.style.setProperty(token, value)
  }
}

// ── Apply panel config ─────────────────────────────────────────────────
export function applyPanelConfig(config: Record<string, string>) {
  const root = document.documentElement
  const c = { ...DEFAULT_PANEL_CONFIG, ...config }

  root.setAttribute('data-activitybar', c.activity_bar_position)
  root.setAttribute('data-statusbar', c.status_bar_position)
  root.setAttribute('data-focus-ring', c.focus_ring_enabled)
  root.style.setProperty('--focus-ring-width', (c.focus_ring_enabled === 'false' ? '0' : c.focus_ring_width) + 'px')
  root.style.setProperty('--focus-ring-color', c.focus_ring_color)
  root.style.setProperty('--focus-ring-offset', (c.focus_ring_offset || '0') + 'px')

  const store = useAppStore.getState()
  store.updatePanelConfig('activity_bar_position', c.activity_bar_position)
  store.updatePanelConfig('status_bar_position', c.status_bar_position)
  store.updatePanelConfig('status_bar_visible', c.status_bar_visible)
  store.updatePanelConfig('activity_bar_visible', c.activity_bar_visible)
  store.updatePanelConfig('focus_ring_enabled', c.focus_ring_enabled)
}
