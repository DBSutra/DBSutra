/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useState, useMemo } from 'react'
import type { QueryResult } from '@core/types'
import { RESULT_PAGE_SIZE } from '@config/commands'

export function useResultState(result: QueryResult | null) {
  const [page, setPage] = useState(0)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filter, setFilter] = useState('')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table')

  const filteredRows = useMemo(() => {
    if (!result || !Array.isArray(result.rows)) return []
    let rows = result.rows ?? []
    if (filter) {
      const lf = filter.toLowerCase()
      rows = rows.filter((row) => row.some((cell) => String(cell ?? '').toLowerCase().includes(lf)))
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const cmp = String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [result, filter, sortCol, sortDir])

  const totalPages = Math.ceil(filteredRows.length / RESULT_PAGE_SIZE)
  const pageRows = filteredRows.slice(page * RESULT_PAGE_SIZE, (page + 1) * RESULT_PAGE_SIZE)

  const rawText = useMemo(() => {
    if (!result) return ''
    const cols = result.columns || []
    if (cols.length === 0 && filteredRows.length === 0) return ''
    const lines: string[] = []
    if (cols.length > 0) { lines.push(cols.join('\t')); lines.push(cols.map((c) => '─'.repeat(Math.max(c.length, 8))).join('─┼─')) }
    for (const row of filteredRows) { lines.push(row.map((cell) => cell === null || cell === undefined ? 'NULL' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)).join('\t')) }
    return lines.join('\n')
  }, [result, filteredRows])

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) { if (sortDir === 'asc') setSortDir('desc'); else { setSortCol(null); setSortDir('asc') } }
    else { setSortCol(colIdx); setSortDir('asc') }
    setPage(0)
  }

  return { page, setPage, sortCol, sortDir, filter, setFilter, selectedIdx, setSelectedIdx, viewMode, setViewMode, filteredRows, totalPages, pageRows, rawText, handleSort, pageSize: RESULT_PAGE_SIZE }
}
