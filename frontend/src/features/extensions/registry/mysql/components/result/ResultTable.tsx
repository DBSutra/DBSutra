/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useCallback } from 'react'
import { Icon, IconButton } from '@primitives'
import { InlineCellEditor } from '@components/editors'

interface Props {
  columns: string[]
  pageRows: unknown[][]
  page: number
  pageSize: number
  totalPages: number
  sortCol: number | null
  sortDir: 'asc' | 'desc'
  selectedIdx: number | null
  onSort: (colIdx: number) => void
  onRowClick: (row: unknown[], globalIdx: number) => void
  onPageChange: (page: number) => void
  onCellEdit?: (rowIdx: number, colIdx: number, value: unknown) => void
}

export const ResultTable: React.FC<Props> = ({
  columns, pageRows, page, pageSize, totalPages, sortCol, sortDir, selectedIdx, onSort, onRowClick, onPageChange, onCellEdit,
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)

  const handleDoubleClick = useCallback((rowIdx: number, colIdx: number) => {
    setEditingCell({ row: rowIdx, col: colIdx })
  }, [])

  const handleSave = useCallback((rowIdx: number, colIdx: number, value: unknown) => {
    setEditingCell(null)
    onCellEdit?.(rowIdx, colIdx, value)
  }, [onCellEdit])

  const handleCancel = useCallback(() => {
    setEditingCell(null)
  }, [])

  return (
    <>
      <div className="rv-table-wrap">
        <table className="rv-table">
          <thead>
            <tr>
              <th className="rv-th rv-th-num">#</th>
              {columns.map((col, i) => (
                <th key={i} className={`rv-th ${sortCol === i ? 'rv-th-sorted' : ''}`} onClick={() => onSort(i)}>
                  <span className="rv-th-label">{col}</span>
                  {sortCol === i && <Icon name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={11} className="rv-sort-icon" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => {
              const globalIdx = page * pageSize + ri
              return (
                <tr key={ri} className={`${ri % 2 === 0 ? 'rv-row-even' : ''} ${selectedIdx === globalIdx ? 'rv-row-selected' : ''}`} onClick={() => onRowClick(row, globalIdx)} style={{ cursor: 'pointer' }}>
                  <td className="rv-td rv-td-num">{globalIdx + 1}</td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="rv-td" onDoubleClick={() => handleDoubleClick(ri, ci)}>
                      {editingCell?.row === ri && editingCell?.col === ci ? (
                        <InlineCellEditor
                          value={cell}
                          column={columns[ci]}
                          rowIndex={globalIdx}
                          onSave={(value) => handleSave(ri, ci, value)}
                          onCancel={handleCancel}
                        />
                      ) : (
                        <span className={`rv-cell-value ${cell === null ? 'rv-null' : ''}`}>
                          {cell === null ? 'NULL' : String(cell)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="rv-pagination">
          <IconButton icon="chevrons-left" size={13} title="First page" onClick={() => onPageChange(0)} disabled={page === 0} />
          <IconButton icon="chevron-left" size={13} title="Previous page" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} />
          <span className="rv-page-info">Page {page + 1} of {totalPages}</span>
          <IconButton icon="chevron-right" size={13} title="Next page" onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} />
          <IconButton icon="chevrons-right" size={13} title="Last page" onClick={() => onPageChange(totalPages - 1)} disabled={page === totalPages - 1} />
        </div>
      )}
    </>
  )
}
