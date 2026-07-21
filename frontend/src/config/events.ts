/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// Well-known event names — single source of truth for the entire app
export const Events = {
  // Connection events
  DB_CONNECTED:    'db.connected',
  DB_DISCONNECTED: 'db.disconnected',
  DB_ERROR:        'db.error',
  QUERY_STARTED:   'query.started',
  QUERY_COMPLETED: 'query.completed',
  QUERY_ERROR:     'query.error',
  QUERY_REFRESH:   'query.refresh',
  ROW_SELECTED:    'row.selected',
  HISTORY_UPDATED: 'history.updated',

  // Layout events
  LAYOUT_CHANGED:  'layout.changed',
  PANEL_OPENED:    'panel.opened',
  PANEL_CLOSED:    'panel.closed',
  PANEL_FOCUSED:   'panel.focused',
  FOCUS_PANEL:     'panel.focus',
  SELECT_CONNECTION: 'schema.selectConnection',

  // Editor events
  TAB_OPENED:      'tab.opened',
  TAB_CLOSED:      'tab.closed',
  TAB_ACTIVATED:   'tab.activated',
  EDITOR_SAVED:    'editor.saved',

  // Extension events
  EXTENSION_ACTIVATED:   'extension.activated',
  EXTENSION_DEACTIVATED: 'extension.deactivated',

  // Theme events
  THEME_CHANGED:   'theme.changed',

  // Settings events
  SETTINGS_CHANGED: 'settings.changed',

  // Command events
  COMMAND_EXECUTED: 'command.executed',
} as const
