/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
export type SettingType = 'text' | 'number' | 'select' | 'boolean' | 'color' | 'font'

export interface SettingDef {
  key: string
  label: string
  description: string
  type: SettingType
  group?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
}

export interface SettingSection {
  id: string
  title: string
  icon: string
  description: string
  table: 'appearance' | 'fonts' | 'panelConfig' | 'shortcuts' | 'colorOverrides'
  settings: SettingDef[]
}
