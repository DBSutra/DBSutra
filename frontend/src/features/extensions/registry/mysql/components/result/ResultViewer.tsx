/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useCallback } from 'react'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { useToast } from '@shared/components'
import { Icon } from '@primitives'
import { useResultState } from './useResultState'
import { ResultStatusBar } from './ResultStatusBar'
import { ResultTable } from './ResultTable'
import '../ResultViewer.css'

export const ResultViewer: React.FC<{ panelId: string }> = () => {
  const { lastQueryResult, queryRunning, setSelectedRow } = useAppStore()
  const activeTab = useAppStore((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? null)
  const toast = useToast()
  const result = lastQueryResult

  const { page, setPage, filter, setFilter, selectedIdx, setSelectedIdx, viewMode, setViewMode, filteredRows, totalPages, pageRows, rawText, handleSort, pageSize } = useResultState(result)

  const handleRowClick = (row: unknown[], globalIdx: number) => {
    setSelectedIdx(globalIdx)
    const contextId = activeTab?.contextId ?? ''
    const parts = contextId.startsWith('table:') ? contextId.split(':') : []
    setSelectedRow({ columns: result?.columns ?? [], values: row, index: globalIdx, connId: activeTab?.connectionId ?? '', database: parts[2] ?? '', table: parts[3] ?? '', dbType: activeTab?.dbType ?? '' })
    EventBus.emit(Events.FOCUS_PANEL, 'row-detail')
  }

  const handleCopyToClipboard = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(rawText)
      toast.success('Results copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }, [result, rawText, toast])

  const handleExportCSV = useCallback(() => {
    if (!result) return
    const csv = [
      result.columns?.join(','),
      ...filteredRows.map((row) => row.map((cell) => `"${cell ?? ''}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Results exported as CSV')
  }, [result, filteredRows, toast])

  if (queryRunning) return <div className="rv-state"><Icon name="loader" size={24} className="rv-spin" /><span className="rv-state-text">Running query...</span></div>
  if (!result) return <div className="rv-state rv-empty"><Icon name="table" size={28} className="rv-empty-icon" /><div className="rv-empty-title">No Results</div><div className="rv-empty-sub">Run a query to see results here</div></div>
  if (result.error) return <div className="rv-state rv-error"><Icon name="warning" size={24} className="rv-error-icon" /><div className="rv-error-title">Query Error</div><pre className="rv-error-msg">{result.error}</pre></div>

  return (
    <div className="result-viewer">
      <ResultStatusBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalRows={result.rows?.length || 0}
        filteredRowCount={filteredRows.length}
        executionTime={result.executionTime}
        filter={filter}
        onFilterChange={(v) => { setFilter(v); setPage(0) }}
        onCopy={handleCopyToClipboard}
        onExport={handleExportCSV}
      />
      {viewMode === 'table' && (
        <ResultTable
          columns={result.columns || []}
          pageRows={pageRows}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          sortCol={null}
          sortDir="asc"
          selectedIdx={selectedIdx}
          onSort={handleSort}
          onRowClick={handleRowClick}
          onPageChange={setPage}
        />
      )}
      {viewMode === 'raw' && (
        <div className="rv-raw-wrap">
          <pre className="rv-raw-text">{rawText}</pre>
        </div>
      )}
    </div>
  )
}
