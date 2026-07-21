/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useMemo, useState, useCallback } from 'react'
import { Icon } from '@primitives'
import { IconButton } from '@primitives'
import './BaseDataTable.css'

export interface BaseDataTableColumn {
  key: string
  label: string
  sortable?: boolean
}

export interface BaseDataTableProps {
  columns: BaseDataTableColumn[]
  rows: unknown[][]
  pageSize?: number
  onRowClick?: (row: unknown[], index: number) => void
  className?: string
}

export const BaseDataTable: React.FC<BaseDataTableProps> = ({
  columns,
  rows,
  pageSize = 100,
  onRowClick,
  className = '',
}) => {
  const [page, setPage] = useState(0)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC')
  const [filterText, setFilterText] = useState('')

  const handleSort = useCallback((colIdx: number) => {
    if (sortCol === colIdx) {
      setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortCol(colIdx)
      setSortDir('ASC')
    }
    setPage(0)
  }, [sortCol])

  const processedRows = useMemo(() => {
    let result = [...rows]

    if (filterText) {
      const lower = filterText.toLowerCase()
      result = result.filter(row =>
        row.some(cell => String(cell ?? '').toLowerCase().includes(lower))
      )
    }

    if (sortCol !== null) {
      result.sort((a, b) => {
        const va = a[sortCol]
        const vb = b[sortCol]
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return sortDir === 'ASC' ? cmp : -cmp
      })
    }

    return result
  }, [rows, filterText, sortCol, sortDir])

  const totalPages = Math.ceil(processedRows.length / pageSize)
  const pageRows = processedRows.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className={`base-dt ${className}`}>
      <div className="base-dt-toolbar">
        <input
          className="base-dt-filter"
          placeholder="Filter..."
          value={filterText}
          onChange={e => { setFilterText(e.target.value); setPage(0) }}
        />
        <span className="base-dt-count">{processedRows.length} rows</span>
      </div>

      <div className="base-dt-table-wrap">
        <table className="base-dt-table">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`base-dt-th ${col.sortable !== false ? 'sortable' : ''}`}
                  onClick={col.sortable !== false ? () => handleSort(i) : undefined}
                >
                  <span>{col.label}</span>
                  {sortCol === i && (
                    <Icon
                      name={sortDir === 'ASC' ? 'sort-asc' : 'sort-desc'}
                      size={12}
                      className="base-dt-sort-icon"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr
                key={ri}
                className="base-dt-row"
                onClick={() => onRowClick?.(row, page * pageSize + ri)}
              >
                {columns.map((_col, ci) => (
                  <td key={ci} className="base-dt-td">
                    {String(row[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="base-dt-pagination">
          <IconButton
            icon="chevron-left"
            size={14}
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          />
          <span className="base-dt-page-info">
            {page + 1} / {totalPages}
          </span>
          <IconButton
            icon="chevron-right"
            size={14}
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          />
        </div>
      )}
    </div>
  )
}
