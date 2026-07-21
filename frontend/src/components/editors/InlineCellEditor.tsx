/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'

interface InlineCellEditorProps {
  value: unknown
  column: string
  rowIndex: number
  onSave: (value: unknown) => void
  onCancel: () => void
  type?: 'text' | 'number' | 'boolean' | 'json'
}

/**
 * DataGrip-style inline cell editor.
 * Allows editing cells directly in the table with double-click.
 */
export const InlineCellEditor: React.FC<InlineCellEditorProps> = ({
  value,
  onSave,
  onCancel,
  type = 'text',
}) => {
  const [editValue, setEditValue] = useState<string>(
    value === null ? 'NULL' : String(value)
  )
  const [isNull, setIsNull] = useState(value === null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSave(isNull ? null : editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onSave(isNull ? null : editValue)
    }
  }, [editValue, isNull, onSave, onCancel])

  const handleBlur = useCallback(() => {
    onSave(isNull ? null : editValue)
  }, [editValue, isNull, onSave])

  return (
    <div className="inline-cell-editor">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'number' ? 'number' : 'text'}
        value={isNull ? '' : editValue}
        onChange={(e) => {
          setEditValue(e.target.value)
          setIsNull(false)
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="inline-cell-input"
        disabled={isNull}
        placeholder={isNull ? 'NULL' : ''}
      />
      <button
        className={`inline-null-btn ${isNull ? 'active' : ''}`}
        onClick={() => setIsNull(!isNull)}
        title="Toggle NULL"
      >
        NULL
      </button>
    </div>
  )
}
