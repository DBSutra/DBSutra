/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { DatabaseType, LayoutNode } from '@core/types'

// ── Layout defaults ────────────────────────────────────────────────────
export const DEFAULT_LAYOUT: LayoutNode = {
  type: 'row',
  sizes: [22, 78],
  children: [
    { type: 'panel', id: 'sidebar', title: 'Explorer', icon: 'database' },
    {
      type: 'column',
      sizes: [60, 40],
      children: [
        { type: 'panel', id: 'editor', title: 'Query Editor', icon: 'code' },
        { type: 'panel', id: 'results', title: 'Results', icon: 'table' },
      ],
    },
  ],
}

// ── Editor settings defaults ───────────────────────────────────────────
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  'editor.fontSize': 12,
  'editor.fontFamily': "'JetBrains Mono', monospace",
  'editor.tabSize': 2,
  'editor.wordWrap': 'off',
  'editor.minimap': false,
  'theme': 'dark',
  'mysql.autoConnect': false,
  'mysql.queryTimeout': 30000,
}

// ── Appearance defaults ────────────────────────────────────────────────
export const DEFAULT_APPEARANCE: Record<string, string> = {
  theme_id: 'dark',
  panel_radius: '6',
  panel_gap: '1',
  divider_size: '3',
  border_width: '1',
  activity_bar_width: '40',
  tabbar_height: '36',
  tab_height: '32',
  tab_padding_left: '10',
  tab_padding_right: '28',
  tab_min_width: '50',
  tab_max_width: '200',
  statusbar_height: '24',
  scrollbar_width: '6',
  radius_xs: '2',
  radius_sm: '4',
  radius_md: '6',
  radius_lg: '8',
  radius_xl: '12',
  radius_full: '9999',
  transition_fast: '80',
  transition_normal: '150',
  transition_slow: '300',
  spacing_1: '2',
  spacing_2: '4',
  spacing_3: '6',
  spacing_4: '8',
  spacing_5: '10',
  spacing_6: '12',
  spacing_7: '14',
  spacing_8: '16',
  spacing_10: '20',
  spacing_12: '24',
  spacing_16: '32',
  layout_left_weight: '20',
  layout_right_weight: '20',
  layout_main_weight: '60',
  layout_top_weight: '30',
  layout_bottom_weight: '70',
}

// ── Font defaults ──────────────────────────────────────────────────────
export const DEFAULT_FONTS: Record<string, string> = {
  ui_family: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  ui_size_xs: '10',
  ui_size_sm: '11',
  ui_size: '13',
  ui_size_md: '14',
  ui_size_lg: '16',
  editor_family: "'JetBrains Mono', 'Fira Code', monospace",
  editor_size: '13',
  mono_family: "'JetBrains Mono', 'Fira Code', monospace",
}

// ── Panel config defaults ──────────────────────────────────────────────
export const DEFAULT_PANEL_CONFIG: Record<string, string> = {
  activity_bar_position: 'left',
  status_bar_position: 'bottom',
  status_bar_visible: 'true',
  activity_bar_visible: 'true',
  focus_ring_enabled: 'true',
  focus_ring_width: '2',
  focus_ring_color: 'var(--color-accent-blue)',
  focus_ring_offset: '0',
}

// ── Database type defaults ─────────────────────────────────────────────
export const DB_DEFAULTS: Record<DatabaseType, { port: number; placeholder: string; label: string }> = {
  mysql:          { port: 3306,  placeholder: 'my_database', label: 'MySQL' },
  postgres:       { port: 5432,  placeholder: 'postgres', label: 'PostgreSQL' },
  mongodb:        { port: 27017, placeholder: 'test', label: 'MongoDB' },
  sqlite:         { port: 0,     placeholder: '/path/to/database.db', label: 'SQLite' },
  redis:          { port: 6379,  placeholder: '0', label: 'Redis' },
  elasticsearch:  { port: 9200,  placeholder: 'my_index', label: 'Elasticsearch' },
}

export const ALL_DB_TYPES: DatabaseType[] = ['mysql', 'postgres', 'mongodb', 'sqlite', 'redis', 'elasticsearch']
