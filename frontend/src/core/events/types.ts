/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
/**
 * Typed event definitions.
 * Add new events here — they get full type safety.
 */
export interface AppEventMap {
  // Connection events
  'db.connected': { connId: string; type: string; name: string }
  'db.disconnected': { connId: string }
  'db.error': { connId: string; error: string }
  'db.schemaChanged': { connId: string }

  // Query events
  'query.started': { connId: string; sql: string }
  'query.completed': { connId: string; rows: number; duration: number }
  'query.error': { connId: string; error: string }
  'query.refresh': { connId?: string }

  // Panel events
  'panel.opened': { panelId: string }
  'panel.closed': { panelId: string }
  'panel.focused': { panelId: string }
  'panel.focus': string  // panelId to focus

  // Tab events
  'tab.opened': { tabId: string }
  'tab.closed': { tabId: string }
  'tab.activated': { tabId: string }

  // Extension events
  'extension.activated': { extensionId: string }
  'extension.deactivated': { extensionId: string }

  // Theme events
  'theme.changed': { themeId: string }

  // Settings events
  'settings.changed': { key: string; value: string }

  // Command events
  'command.executed': { commandId: string; args?: unknown[] }

  // Layout events
  'layout.changed': undefined
  'layout.sidebar.toggled': { visible: boolean }
  'layout.panel.toggled': { visible: boolean }

  // Schema events
  'schema.selectConnection': { connId: string }
  'row.selected': { row: Record<string, unknown>; table: string }

  // History events
  'history.updated': undefined

  // Editor events
  'editor.saved': undefined
}

export type EventHandler<T = unknown> = (payload: T) => void
