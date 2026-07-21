/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@core/state/store'
import { InsertRow, UpdateRow, DeleteRow } from '@bindings/clientdb/dbservice'
import { EventBus, Events } from '@core/events/EventBus'
import { useToast } from '@shared/components'

type Mode = 'view' | 'edit' | 'add'

export function useRowOperations() {
  const selectedRow = useAppStore((s) => s.selectedRow)
  const clearSelectedRow = useAppStore((s) => s.clearSelectedRow)
  const schemaCache = useAppStore((s) => s.schemaCache)
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('view')
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const schemaColumns = useMemo(() => {
    if (!selectedRow) return []
    const schemas = schemaCache[selectedRow.connId]
    if (!schemas) return []
    const db = schemas.find((d) => d.name === selectedRow.database)
    if (!db) return []
    const tbl = db.tables.find((t) => t.name === selectedRow.table)
    return tbl?.columns ?? []
  }, [selectedRow, schemaCache])

  const getKeyColumns = useCallback((): Record<string, unknown> => {
    if (!selectedRow) return {}
    const { columns, values, dbType } = selectedRow
    const idIdx = columns.indexOf('_id')
    if (idIdx >= 0 && values[idIdx] != null) return { _id: values[idIdx] }
    if (dbType !== 'mongodb') {
      const pkCol = schemaColumns.find((c) => c.key === 'PRI')
      if (pkCol) { const pkIdx = columns.indexOf(pkCol.name); if (pkIdx >= 0) return { [pkCol.name]: values[pkIdx] } }
    }
    if (columns.length > 0 && values[0] != null) return { [columns[0]]: values[0] }
    return {}
  }, [selectedRow, schemaColumns])

  useEffect(() => {
    setMode('view'); setStatus(null)
    if (selectedRow) {
      const vals: Record<string, string> = {}
      selectedRow.columns.forEach((col, i) => { vals[col] = selectedRow.values[i] == null ? '' : String(selectedRow.values[i]) })
      setEditValues(vals)
    }
  }, [selectedRow])

  const enterEditMode = () => {
    if (!selectedRow) return
    const vals: Record<string, string> = {}
    selectedRow.columns.forEach((col, i) => { vals[col] = selectedRow.values[i] == null ? '' : String(selectedRow.values[i]) })
    setEditValues(vals); setMode('edit'); setStatus(null)
  }

  const enterAddMode = () => {
    const vals: Record<string, string> = {}
    const cols = selectedRow?.columns ?? schemaColumns.map((c) => c.name)
    cols.forEach((col) => { vals[col] = '' })
    setEditValues(vals); setMode('add'); setStatus(null)
  }

  const handleSave = async () => {
    if (!selectedRow) return
    setLoading(true); setStatus(null)
    try {
      if (mode === 'edit') {
        const keyColumns = getKeyColumns()
        if (Object.keys(keyColumns).length === 0) { setStatus({ type: 'error', msg: 'Cannot identify row — no key column found' }); setLoading(false); return }
        const data: Record<string, unknown> = {}
        selectedRow.columns.forEach((col) => { const origVal = String(selectedRow.values[selectedRow.columns.indexOf(col)] ?? ''); if (editValues[col] !== origVal) data[col] = editValues[col] || null })
        if (Object.keys(data).length === 0) { setStatus({ type: 'success', msg: 'No changes to save' }); setLoading(false); return }
        await UpdateRow(selectedRow.connId, selectedRow.database, selectedRow.table, keyColumns, data)
        setStatus({ type: 'success', msg: '✓ Row updated successfully' }); setMode('view')
        toast.success('Row updated successfully')
        const newValues = [...selectedRow.values]; selectedRow.columns.forEach((col, i) => { if (col in data) newValues[i] = editValues[col] })
        useAppStore.getState().setSelectedRow({ ...selectedRow, values: newValues })
      } else if (mode === 'add') {
        const data: Record<string, unknown> = {}
        Object.entries(editValues).forEach(([k, v]) => { if (v !== '') data[k] = v })
        if (Object.keys(data).length === 0) { setStatus({ type: 'error', msg: 'Please fill in at least one field' }); setLoading(false); return }
        await InsertRow(selectedRow.connId, selectedRow.database, selectedRow.table, data)
        setStatus({ type: 'success', msg: '✓ Row inserted successfully' }); setMode('view')
        toast.success('Row inserted successfully')
      }
      setTimeout(() => EventBus.emit(Events.QUERY_REFRESH), 300)
    } catch (err: unknown) { setStatus({ type: 'error', msg: String(err) }); toast.error(`Save failed: ${String(err)}`) }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!selectedRow) return
    const keyColumns = getKeyColumns()
    if (Object.keys(keyColumns).length === 0) { setStatus({ type: 'error', msg: 'Cannot identify row — no key column found' }); return }
    setLoading(true); setStatus(null)
    try {
      await DeleteRow(selectedRow.connId, selectedRow.database, selectedRow.table, keyColumns)
      setStatus({ type: 'success', msg: '✓ Row deleted' }); clearSelectedRow()
      toast.success('Row deleted')
      setTimeout(() => EventBus.emit(Events.QUERY_REFRESH), 300)
    } catch (err: unknown) { setStatus({ type: 'error', msg: String(err) }); toast.error(`Delete failed: ${String(err)}`) }
    finally { setLoading(false) }
  }

  return { selectedRow, schemaColumns, mode, editValues, setEditValues, status, loading, enterEditMode, enterAddMode, handleSave, handleDelete, setMode, setStatus }
}
