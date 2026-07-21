/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { SchemaColumn } from '@core/types'
import { Icon, Dropdown, Input } from '@primitives'

interface Props {
  availableColumns: SchemaColumn[]
  filterCol: string
  filterOp: string
  filterVal: string
  sortCol: string
  sortDir: 'ASC' | 'DESC'
  onFilterColChange: (val: string) => void
  onFilterOpChange: (val: string) => void
  onFilterValChange: (val: string) => void
  onSortColChange: (val: string) => void
  onSortDirToggle: () => void
  onRun: () => void
}

export const FilterBar: React.FC<Props> = ({
  availableColumns, filterCol, filterOp, filterVal, sortCol, sortDir,
  onFilterColChange, onFilterOpChange, onFilterValChange, onSortColChange, onSortDirToggle, onRun,
}) => (
  <div className="qe-quick-filters">
    <Dropdown options={availableColumns.map((c) => ({ value: c.name, label: c.name }))} value={filterCol} onChange={onFilterColChange} />
    <Dropdown options={[{ value: 'LIKE', label: 'LIKE' }, { value: '=', label: '=' }, { value: '!=', label: '!=' }, { value: '>', label: '>' }, { value: '>=', label: '>=' }, { value: '<', label: '<' }, { value: '<=', label: '<=' }, { value: 'IN', label: 'IN' }]} value={filterOp} onChange={onFilterOpChange} />
    <Input icon="search" className="qe-filter-input-wrap" placeholder="Value..." value={filterVal} onChange={(e) => onFilterValChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onRun()} />
    <div className="qe-toolbar-divider" />
    <Dropdown options={[{ value: '', label: 'Order by...' }, ...availableColumns.map((c) => ({ value: c.name, label: c.name }))]} value={sortCol} onChange={onSortColChange} />
    <button className={`qe-sort-dir-btn ${!sortCol ? 'disabled' : ''}`} onClick={onSortDirToggle} disabled={!sortCol} title="Toggle Sort Direction">
      <Icon name={sortDir === 'ASC' ? 'arrow-up' : 'arrow-down'} size={14} />
    </button>
  </div>
)
