/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { SchemaColumn } from '@core/types'
import { Icon } from '@primitives'
import { AutoTextarea } from './AutoTextarea'

interface Props {
  columns: string[]
  values: unknown[]
  editValues: Record<string, string>
  schemaColumns: SchemaColumn[]
  mode: 'view' | 'edit' | 'add'
  onEditValueChange: (col: string, val: string) => void
  onEnterEditMode: () => void
}

const isIdField = (col: string) => col === '_id' || col === 'id'

export const RowFields: React.FC<Props> = ({ columns, values, editValues, schemaColumns, mode, onEditValueChange, onEnterEditMode }) => (
  <div className="rdp-fields">
    {columns.map((col, i) => {
      const value = mode === 'add' ? null : values[i]
      const isEditing = mode === 'edit' || mode === 'add'
      const schemaCol = schemaColumns.find((c) => c.name === col)
      const isId = isIdField(col)
      const displayValue = value == null ? '' : String(value)
      const isLong = displayValue.length > 60

      return (
        <div key={col} className={`rdp-field ${isId ? 'rdp-field-key' : ''}`}>
          <div className="rdp-field-header">
            {isId && <Icon name="key" size={10} className="rdp-field-key-icon" />}
            <span className="rdp-field-name">{col}</span>
            {schemaCol?.type && <span className="rdp-field-type">{schemaCol.type}</span>}
          </div>
          {isEditing ? (
            <AutoTextarea className={`rdp-field-input ${isId && mode === 'edit' ? 'rdp-field-readonly' : ''}`} value={editValues[col] ?? ''} onChange={(val) => onEditValueChange(col, val)} placeholder={value == null ? 'NULL' : ''} readOnly={isId && mode === 'edit'} />
          ) : (
            <div className={`rdp-field-value ${value == null ? 'rdp-null' : ''} ${isLong ? 'rdp-field-long' : ''}`} onDoubleClick={onEnterEditMode} title="Double-click to edit">
              {value == null ? 'NULL' : displayValue}
            </div>
          )}
        </div>
      )
    })}
  </div>
)
