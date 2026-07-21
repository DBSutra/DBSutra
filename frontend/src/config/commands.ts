/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// Panel navigation order (matches visual layout)
export const PANEL_ORDER = [
  'connections', 'explorer', 'history', 'settings', 'extensions',
  'editor', 'results', 'eer-diagram', 'row-detail',
]

// Human-readable labels for panels
export const PANEL_LABELS: Record<string, string> = {
  'connections': 'Connections',
  'explorer': 'Schema Explorer',
  'history': 'History',
  'settings': 'Settings',
  'extensions': 'Extensions',
  'editor': 'Query Editor',
  'results': 'Results',
  'eer-diagram': 'EER Diagram',
  'row-detail': 'Row Inspector',
}

// Debounce delays (ms)
export const DEBOUNCE_DELAY_DEFAULT = 300
export const DEBOUNCE_DELAY_LAYOUT = 500

// Result viewer
export const RESULT_PAGE_SIZE = 100
