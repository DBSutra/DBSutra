/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@core/state/store'
import { DEFAULT_QUERY_CONTENT } from '@shared/constants/defaults'
import { Icon } from '@primitives'
import { CodeMirrorEditor } from '@editor'
import type { EditorView } from '@codemirror/view'
import { VirtualTabList } from '../VirtualTabList'
import { useQueryExecution } from './useQueryExecution'
import { useLiveQuery } from './useLiveQuery'
import { FilterBar } from './FilterBar'
import { QueryToolbar } from './QueryToolbar'
import '../QueryEditor.css'

export const QueryEditor: React.FC<{ panelId: string }> = () => {
  const activeTab = useAppStore((s) => s.tabs.find((x) => x.id === s.activeTabId) ?? null)
  const { updateTabContent, markTabDirty } = useAppStore(useShallow((s) => ({
    updateTabContent: s.updateTabContent, markTabDirty: s.markTabDirty,
  })))

  const { runQuery, queryRunning } = useQueryExecution(activeTab)
  const { filterCol, filterOp, filterVal, sortCol, sortDir, setFilterCol, setFilterOp, setFilterVal, setSortCol, setSortDir, availableColumns, isTableContext, updateLiveQuery } = useLiveQuery(activeTab)

  const handleEditorKeyDown = useCallback((e: KeyboardEvent, _view: EditorView): boolean => {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey
    if (e.key === 'F5' || (isCmdOrCtrl && e.key === 'Enter')) { e.preventDefault(); runQuery(); return true }
    if (isCmdOrCtrl && (e.key === 's' || e.key === 'S')) { e.preventDefault(); if (activeTab) markTabDirty(activeTab.id, false); return true }
    return false
  }, [runQuery, activeTab, markTabDirty])

  const openNewTab = () => {
    useAppStore.getState().openTab({ title: 'Query', language: 'sql', content: DEFAULT_QUERY_CONTENT, isDirty: false })
  }

  return (
    <div className="query-editor">
      <VirtualTabList />
      {activeTab ? (
        <div className="qe-editor-wrap">
          <CodeMirrorEditor value={activeTab.content} onChange={(val) => updateTabContent(activeTab.id, val)} language={activeTab.language === 'javascript' ? 'javascript' : 'sql'} onKeyDown={handleEditorKeyDown} />
        </div>
      ) : (
        <div className="qe-empty">
          <Icon name="code" size={32} className="qe-empty-icon" />
          <div className="qe-empty-title">No Query Open</div>
          <div className="qe-empty-sub">Connect to a database or open a new tab</div>
          <button className="qe-empty-btn" onClick={openNewTab}><Icon name="plus" size={14} />New Query Tab</button>
        </div>
      )}
      {activeTab && (
        <QueryToolbar onSave={() => markTabDirty(activeTab.id, false)} onRun={runQuery} queryRunning={queryRunning} hasConnection={!!activeTab.connectionId}>
          {isTableContext && availableColumns.length > 0 && (
            <FilterBar availableColumns={availableColumns} filterCol={filterCol} filterOp={filterOp} filterVal={filterVal} sortCol={sortCol} sortDir={sortDir} onFilterColChange={(c) => { setFilterCol(c); if (filterVal) updateLiveQuery(c, filterOp, filterVal, sortCol, sortDir) }} onFilterOpChange={(o) => { setFilterOp(o); if (filterVal) updateLiveQuery(filterCol, o, filterVal, sortCol, sortDir) }} onFilterValChange={(v) => { setFilterVal(v); updateLiveQuery(filterCol, filterOp, v, sortCol, sortDir) }} onSortColChange={(c) => { setSortCol(c); updateLiveQuery(filterCol, filterOp, filterVal, c, sortDir) }} onSortDirToggle={() => { if (!sortCol) return; const newDir = sortDir === 'ASC' ? 'DESC' : 'ASC'; setSortDir(newDir); updateLiveQuery(filterCol, filterOp, filterVal, sortCol, newDir) }} onRun={runQuery} />
          )}
        </QueryToolbar>
      )}
    </div>
  )
}
