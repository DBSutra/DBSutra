/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '@primitives'
import { useRowOperations } from './useRowOperations'
import { RowFields } from './RowFields'
import '../RowDetailPanel.css'

export const RowDetailPanel: React.FC<{ panelId: string }> = () => {
  const { selectedRow, schemaColumns, mode, editValues, setEditValues, status, loading, enterEditMode, enterAddMode, handleSave, handleDelete, setMode, setStatus } = useRowOperations()
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setIsMoreMenuOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!selectedRow) {
    return (
      <div className="row-detail-panel">
        <div className="rdp-empty">
          <div className="rdp-empty-icon-wrap"><Icon name="mouse-pointer-click" size={32} className="rdp-empty-icon" /></div>
          <div className="rdp-empty-title">Row Inspector</div>
          <div className="rdp-empty-sub">Click any row in the results table to view, edit, or delete it here</div>
          <button className="rdp-empty-btn" style={{ marginTop: 12 }} onClick={enterAddMode}><Icon name="plus" size={12} />New Row</button>
        </div>
      </div>
    )
  }

  const columns = mode === 'add' ? (schemaColumns.length > 0 ? schemaColumns.map((c) => c.name) : selectedRow.columns) : selectedRow.columns

  return (
    <div className="row-detail-panel">
      <div className="rdp-toolbar">
        <div className="rdp-toolbar-left">
          <span className="rdp-toolbar-title">{mode === 'add' ? 'New Row' : mode === 'edit' ? 'Editing Row' : 'Row Inspector'}</span>
          <span className="rdp-toolbar-badge">{selectedRow.table}</span>
          {mode === 'view' && <span className="rdp-toolbar-sub">#{selectedRow.index + 1}</span>}
        </div>
        <div className="rdp-toolbar-actions">
          {mode === 'view' && (
            <>
              <button className="rdp-native-btn" onClick={enterAddMode} title="Add a new row"><Icon name="plus" size={13} /></button>
              <button className="rdp-native-btn" onClick={enterEditMode} title="Edit this row"><Icon name="pencil" size={13} /></button>
              <div className="rdp-more-wrap" ref={moreMenuRef}>
                <button className={`rdp-native-btn ${isMoreMenuOpen ? 'active' : ''}`} onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} title="More actions"><Icon name="more" size={14} /></button>
                {isMoreMenuOpen && <div className="rdp-more-menu"><button className="rdp-menu-item rdp-menu-danger" onClick={() => { setIsMoreMenuOpen(false); handleDelete() }} disabled={loading}><Icon name="trash" size={12} /> Delete Row</button></div>}
              </div>
            </>
          )}
          {(mode === 'edit' || mode === 'add') && (
            <>
              <button className="rdp-native-btn rdp-cancel-btn" onClick={() => { setMode('view'); setStatus(null) }}>Cancel</button>
              <button className="rdp-native-btn rdp-save-btn" onClick={handleSave} disabled={loading}><Icon name={loading ? 'loader' : 'check'} size={12} className={loading ? 'rdp-spin' : ''} />{loading ? 'Saving' : 'Save'}</button>
            </>
          )}
        </div>
      </div>
      <RowFields columns={columns} values={selectedRow.values} editValues={editValues} schemaColumns={schemaColumns} mode={mode} onEditValueChange={(col, val) => setEditValues((prev) => ({ ...prev, [col]: val }))} onEnterEditMode={enterEditMode} />
      {status && <div className={`rdp-status rdp-status-${status.type}`}><Icon name={status.type === 'success' ? 'check-circle' : 'alert-circle'} size={12} /><span>{status.msg}</span></div>}
    </div>
  )
}
