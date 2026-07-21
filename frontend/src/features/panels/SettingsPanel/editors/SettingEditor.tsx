/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useCallback } from 'react'
import type { SettingDef } from '../types'

export interface SettingEditorProps {
  def: SettingDef
  value: string
  onChange: (key: string, value: string) => void
}

export const SettingEditor: React.FC<SettingEditorProps> = ({ def, value, onChange }) => {
  const handleChange = useCallback(
    (newValue: string) => onChange(def.key, newValue),
    [def.key, onChange]
  )

  switch (def.type) {
    case 'select':
      return (
        <select
          className="se-select"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
        >
          {(def.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )

    case 'number':
      return (
        <div className="se-number-wrap">
          <input
            type="number"
            className="se-number"
            value={value}
            min={def.min}
            max={def.max}
            step={def.step}
            onChange={(e) => handleChange(e.target.value)}
          />
          {def.unit && <span className="se-unit">{def.unit}</span>}
        </div>
      )

    case 'boolean':
      return (
        <label className="se-toggle">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => handleChange(e.target.checked ? 'true' : 'false')}
          />
          <span className="se-toggle-track">
            <span className="se-toggle-thumb" />
          </span>
          <span className="se-toggle-label">{value === 'true' ? 'On' : 'Off'}</span>
        </label>
      )

    case 'color':
      return (
        <div className="se-color-wrap">
          <input
            type="color"
            className="se-color-picker"
            value={value || '#000000'}
            onChange={(e) => handleChange(e.target.value)}
          />
          <input
            type="text"
            className="se-color-text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="#000000"
          />
        </div>
      )

    case 'font':
      return (
        <input
          type="text"
          className="se-text-input se-font-input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={def.placeholder}
          style={{ fontFamily: value || undefined }}
        />
      )

    default:
      return (
        <input
          type="text"
          className="se-text-input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={def.placeholder}
        />
      )
  }
}
