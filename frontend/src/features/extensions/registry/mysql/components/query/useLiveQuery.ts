/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useEffect, useCallback } from 'react'
import { useAppStore } from '@core/state/store'
import type { EditorTab, SchemaColumn } from '@core/types'

export function useLiveQuery(activeTab: EditorTab | null) {
  const schemaCache = useAppStore((s) => s.schemaCache)
  const { updateTabFilters } = useAppStore()

  const filterCol = activeTab?.filterCol ?? ''
  const filterOp = activeTab?.filterOp ?? 'LIKE'
  const filterVal = activeTab?.filterVal ?? ''
  const sortCol = activeTab?.sortCol ?? ''
  const sortDir = activeTab?.sortDir ?? 'ASC'

  const setFilterCol = (val: string) => activeTab && updateTabFilters(activeTab.id, { filterCol: val })
  const setFilterOp = (val: string) => activeTab && updateTabFilters(activeTab.id, { filterOp: val })
  const setFilterVal = (val: string) => activeTab && updateTabFilters(activeTab.id, { filterVal: val })
  const setSortCol = (val: string) => activeTab && updateTabFilters(activeTab.id, { sortCol: val })
  const setSortDir = (val: 'ASC' | 'DESC') => activeTab && updateTabFilters(activeTab.id, { sortDir: val })

  const isTableContext = activeTab?.contextId?.startsWith('table:')
  const dbType = activeTab?.dbType ?? ''
  let tableDb = ''
  let tableName = ''
  let availableColumns: SchemaColumn[] = []

  if (isTableContext && activeTab?.connectionId) {
    const parts = activeTab.contextId!.split(':')
    if (parts.length >= 4) {
      tableDb = parts[2]
      tableName = parts[3]
      const schemas = schemaCache[activeTab.connectionId]
      if (schemas) {
        const db = schemas.find((d) => d.name === tableDb)
        if (db) { const tbl = db.tables.find((t) => t.name === tableName); if (tbl) availableColumns = tbl.columns ?? [] }
      }
    }
  }

  useEffect(() => {
    if (availableColumns.length > 0 && (!filterCol || !availableColumns.find((c) => c.name === filterCol))) {
      setFilterCol(availableColumns[0].name)
    }
  }, [availableColumns, filterCol])

  const updateLiveQuery = useCallback((col: string, op: string, val: string, sCol: string, sDir: string) => {
    if (!activeTab || !isTableContext) return
    const sql = activeTab.content

    if (dbType === 'mongodb') {
      const baseMatch = new RegExp(`^db\\.${tableName}\\.find\\(`, 'i')
      if (baseMatch.test(sql)) {
        let queryObj: any = {}
        if (col && val) {
          const isNum = !isNaN(Number(val)) && val.trim() !== ''
          const numVal = isNum ? Number(val) : val
          switch (op) {
            case '=': queryObj[col] = numVal; break; case '!=': queryObj[col] = { $ne: numVal }; break
            case '>': queryObj[col] = { $gt: numVal }; break; case '>=': queryObj[col] = { $gte: numVal }; break
            case '<': queryObj[col] = { $lt: numVal }; break; case '<=': queryObj[col] = { $lte: numVal }; break
            case 'IN': queryObj[col] = { $in: val.split(',').map((v) => { const s = v.trim(); return (!isNaN(Number(s)) && s !== '') ? Number(s) : s }) }; break
            default: queryObj[col] = { $regex: val, $options: 'i' }; break
          }
        }
        let newSql = `db.${tableName}.find(${Object.keys(queryObj).length > 0 ? JSON.stringify(queryObj) : '{}'})`
        if (sCol) newSql += `.sort(${JSON.stringify({ [sCol]: sDir === 'ASC' ? 1 : -1 })})`
        const limitMatch = sql.match(/\.limit\((\d+)\)/i)
        newSql += `.limit(${limitMatch ? limitMatch[1] : '100'})`
        if (newSql !== sql) useAppStore.getState().updateTabContent(activeTab.id, newSql)
      }
      return
    }

    const q = dbType === 'postgres' ? '"' : '`'
    const escapedQ = q === '"' ? '"' : '\\`'
    const baseMatch = new RegExp(`^SELECT \\* FROM ${escapedQ}${tableDb}${escapedQ}\\.${escapedQ}${tableName}${escapedQ}`, 'i')
    if (baseMatch.test(sql)) {
      let newSql = `SELECT * FROM ${q}${tableDb}${q}.${q}${tableName}${q}`
      if (val && col) {
        const escaped = val.replace(/'/g, "''")
        let whereClause = ''
        switch (op) {
          case '=': case '!=': case '>': case '>=': case '<': case '<=': whereClause = `${q}${col}${q} ${op} '${escaped}'`; break
          case 'IN': whereClause = `${q}${col}${q} IN (${escaped.split(',').map((v) => `'${v.trim()}'`).join(', ')})`; break
          default: whereClause = `${q}${col}${q} ${dbType === 'postgres' ? 'ILIKE' : "LIKE"} '%${escaped}%'`; break
        }
        newSql += ` WHERE ${whereClause}`
      }
      if (sCol) newSql += ` ORDER BY ${q}${sCol}${q} ${sDir}`
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
      newSql += ` LIMIT ${limitMatch ? limitMatch[1] : '100'};`
      if (newSql !== sql) useAppStore.getState().updateTabContent(activeTab.id, newSql)
    }
  }, [activeTab, isTableContext, tableDb, tableName, dbType])

  return { filterCol, filterOp, filterVal, sortCol, sortDir, setFilterCol, setFilterOp, setFilterVal, setSortCol, setSortDir, availableColumns, isTableContext, updateLiveQuery }
}
