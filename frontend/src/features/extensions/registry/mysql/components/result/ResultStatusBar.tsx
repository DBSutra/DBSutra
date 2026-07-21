/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon, IconButton } from '@primitives'

interface Props {
  viewMode: 'table' | 'raw'
  onViewModeChange: (mode: 'table' | 'raw') => void
  totalRows: number
  filteredRowCount: number
  executionTime?: number
  filter: string
  onFilterChange: (val: string) => void
  onCopy?: () => void
  onExport?: () => void
}

export const ResultStatusBar: React.FC<Props> = ({
  viewMode, onViewModeChange, totalRows, filteredRowCount, executionTime, filter, onFilterChange, onCopy, onExport,
}) => (
  <div className="rv-statusbar">
    <div className="rv-view-toggle">
      <button className={`rv-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => onViewModeChange('table')} title="Table view">
        <Icon name="table" size={12} /><span>Table</span>
      </button>
      <button className={`rv-view-btn ${viewMode === 'raw' ? 'active' : ''}`} onClick={() => onViewModeChange('raw')} title="Raw text view">
        <Icon name="file" size={12} /><span>Raw</span>
      </button>
    </div>
    <div className="rv-separator" />
    <span className="rv-stat">
      <Icon name="table" size={12} />
      {totalRows.toLocaleString()} rows
      {filteredRowCount !== totalRows && ` (${filteredRowCount.toLocaleString()} filtered)`}
    </span>
    {executionTime !== undefined && (
      <span className="rv-stat rv-time">{executionTime < 1000 ? `${executionTime}ms` : `${(executionTime / 1000).toFixed(2)}s`}</span>
    )}
    <div className="rv-spacer" />
    {viewMode === 'table' && (
      <div className="rv-filter-wrap">
        <Icon name="filter" size={12} className="rv-filter-icon" />
        <input className="rv-filter" placeholder="Filter..." value={filter} onChange={(e) => onFilterChange(e.target.value)} />
      </div>
    )}
    <IconButton icon="download" size={13} title="Export CSV" onClick={onExport} />
    <IconButton icon="copy" size={13} title="Copy to clipboard" onClick={onCopy} />
  </div>
)
