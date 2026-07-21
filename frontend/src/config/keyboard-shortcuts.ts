/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
/**
 * Keyboard shortcuts configuration.
 * Follows DataGrip conventions for database operations.
 */

export interface KeyboardShortcut {
  id: string
  label: string
  keys: string
  category: string
  description: string
}

/**
 * Default keyboard shortcuts following DataGrip conventions.
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Query Operations
  { id: 'query.execute', label: 'Execute Query', keys: 'Ctrl+Enter', category: 'Query', description: 'Execute the current query' },
  { id: 'query.execute.script', label: 'Execute Script', keys: 'Ctrl+Shift+Enter', category: 'Query', description: 'Execute the entire script' },
  { id: 'query.format', label: 'Format Query', keys: 'Ctrl+Shift+F', category: 'Query', description: 'Format the SQL query' },
  { id: 'query.explain', label: 'Explain Query', keys: 'Ctrl+Shift+E', category: 'Query', description: 'Show query execution plan' },
  { id: 'query.stop', label: 'Stop Query', keys: 'Ctrl+C', category: 'Query', description: 'Stop the running query' },

  // Navigation
  { id: 'nav.nextTab', label: 'Next Tab', keys: 'Ctrl+Tab', category: 'Navigation', description: 'Switch to next tab' },
  { id: 'nav.prevTab', label: 'Previous Tab', keys: 'Ctrl+Shift+Tab', category: 'Navigation', description: 'Switch to previous tab' },
  { id: 'nav.closeTab', label: 'Close Tab', keys: 'Ctrl+W', category: 'Navigation', description: 'Close current tab' },
  { id: 'nav.newTab', label: 'New Tab', keys: 'Ctrl+T', category: 'Navigation', description: 'Open new query tab' },
  { id: 'nav.commandPalette', label: 'Command Palette', keys: 'Ctrl+Shift+P', category: 'Navigation', description: 'Open command palette' },

  // Editor
  { id: 'editor.save', label: 'Save', keys: 'Ctrl+S', category: 'Editor', description: 'Save current file' },
  { id: 'editor.selectAll', label: 'Select All', keys: 'Ctrl+A', category: 'Editor', description: 'Select all text' },
  { id: 'editor.find', label: 'Find', keys: 'Ctrl+F', category: 'Editor', description: 'Find in editor' },
  { id: 'editor.replace', label: 'Replace', keys: 'Ctrl+H', category: 'Editor', description: 'Find and replace' },
  { id: 'editor.undo', label: 'Undo', keys: 'Ctrl+Z', category: 'Editor', description: 'Undo last action' },
  { id: 'editor.redo', label: 'Redo', keys: 'Ctrl+Shift+Z', category: 'Editor', description: 'Redo last action' },

  // Data Grid
  { id: 'grid.edit', label: 'Edit Cell', keys: 'Enter', category: 'Data Grid', description: 'Edit selected cell' },
  { id: 'grid.delete', label: 'Delete Row', keys: 'Delete', category: 'Data Grid', description: 'Delete selected row' },
  { id: 'grid.insert', label: 'Insert Row', keys: 'Ctrl+I', category: 'Data Grid', description: 'Insert new row' },
  { id: 'grid.copy', label: 'Copy', keys: 'Ctrl+C', category: 'Data Grid', description: 'Copy selected cells' },
  { id: 'grid.paste', label: 'Paste', keys: 'Ctrl+V', category: 'Data Grid', description: 'Paste into cells' },
  { id: 'grid.selectAll', label: 'Select All', keys: 'Ctrl+A', category: 'Data Grid', description: 'Select all cells' },

  // Connection
  { id: 'conn.connect', label: 'Connect', keys: 'Ctrl+Shift+C', category: 'Connection', description: 'Connect to database' },
  { id: 'conn.disconnect', label: 'Disconnect', keys: 'Ctrl+Shift+D', category: 'Connection', description: 'Disconnect from database' },
  { id: 'conn.refresh', label: 'Refresh', keys: 'F5', category: 'Connection', description: 'Refresh schema' },

  // Panels
  { id: 'panel.schema', label: 'Schema Panel', keys: 'Ctrl+1', category: 'Panels', description: 'Focus schema panel' },
  { id: 'panel.editor', label: 'Editor Panel', keys: 'Ctrl+2', category: 'Panels', description: 'Focus editor panel' },
  { id: 'panel.results', label: 'Results Panel', keys: 'Ctrl+3', category: 'Panels', description: 'Focus results panel' },
  { id: 'panel.history', label: 'History Panel', keys: 'Ctrl+4', category: 'Panels', description: 'Focus history panel' },
  { id: 'panel.preferences', label: 'Preferences', keys: 'Ctrl+,', category: 'Panels', description: 'Open preferences' },
]

/**
 * Shortcut categories for UI organization.
 */
export const SHORTCUT_CATEGORIES = [
  { id: 'Query', icon: 'play' },
  { id: 'Navigation', icon: 'navigation' },
  { id: 'Editor', icon: 'code' },
  { id: 'Data Grid', icon: 'table' },
  { id: 'Connection', icon: 'plug-zap' },
  { id: 'Panels', icon: 'layout' },
] as const
