/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
/**
 * User preferences configuration.
 * Follows tiny-rdm pattern for comprehensive user settings.
 */

export interface UserPreferences {
  // General
  general: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    fontFamily: string
    fontSize: number
    showLineNumbers: boolean
    wordWrap: boolean
    autoSave: boolean
    confirmOnExit: boolean
  }

  // Editor
  editor: {
    fontFamily: string
    fontSize: number
    tabSize: number
    showLineNumbers: boolean
    codeFolding: boolean
    autoCloseBrackets: boolean
    matchBrackets: boolean
    highlightActiveLine: boolean
  }

  // Query
  query: {
    maxRows: number
    autoLimit: boolean
    defaultLimit: number
    confirmOnExecute: boolean
    showExecutionTime: boolean
    historySize: number
  }

  // Connection
  connection: {
    autoConnect: boolean
    connectionTimeout: number
    queryTimeout: number
    retryAttempts: number
    showSystemDatabases: boolean
  }

  // UI
  ui: {
    showStatusBar: boolean
    showActivityBar: boolean
    showMinimap: boolean
    sidebarWidth: number
    panelGap: number
    animationSpeed: 'fast' | 'normal' | 'slow'
  }
}

/**
 * Default preferences values.
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  general: {
    theme: 'dark',
    language: 'en',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontSize: 13,
    showLineNumbers: true,
    wordWrap: false,
    autoSave: true,
    confirmOnExit: true,
  },
  editor: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13,
    tabSize: 2,
    showLineNumbers: true,
    codeFolding: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    highlightActiveLine: true,
  },
  query: {
    maxRows: 1000,
    autoLimit: true,
    defaultLimit: 100,
    confirmOnExecute: false,
    showExecutionTime: true,
    historySize: 100,
  },
  connection: {
    autoConnect: false,
    connectionTimeout: 30,
    queryTimeout: 30,
    retryAttempts: 3,
    showSystemDatabases: false,
  },
  ui: {
    showStatusBar: true,
    showActivityBar: true,
    showMinimap: false,
    sidebarWidth: 250,
    panelGap: 1,
    animationSpeed: 'normal',
  },
}

/**
 * Preference categories for UI organization.
 */
export const PREFERENCE_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'editor', label: 'Editor', icon: 'code' },
  { id: 'query', label: 'Query', icon: 'play' },
  { id: 'connection', label: 'Connection', icon: 'plug-zap' },
  { id: 'ui', label: 'Interface', icon: 'layout' },
] as const
