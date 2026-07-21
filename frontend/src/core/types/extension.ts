/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// ── Extension Types ──────────────────────────────────────────────────
export interface ExtensionManifest {
  id: string
  name: string
  version: string
  description?: string
  activationEvents: string[]
  contributes: {
    commands?: string[]
    views?: string[]
    databases?: string[]
    themes?: string[]
    settings?: Record<string, SettingSchema>
  }
}

export interface SettingSchema {
  type: 'boolean' | 'number' | 'string' | 'enum'
  default: unknown
  description?: string
  enum?: string[]
  min?: number
  max?: number
}
