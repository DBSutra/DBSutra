/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useCallback, useEffect } from 'react'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { Query as QueryDB } from '@bindings/clientdb/dbservice'
import { AddQueryHistory } from '@bindings/clientdb/stateservice'
import { logError } from '@shared/utils/errors'
import { useToast } from '@shared/components'
import type { EditorTab, QueryResult } from '@core/types'
import { useEventBus } from '@shared/hooks'

const CTX = { module: 'QueryEditor', operation: '' }

export function useQueryExecution(activeTab: EditorTab | null) {
  const queryRunning = useAppStore((s) => s.queryRunning)
  const { setLastQueryResult, setQueryRunning, markTabDirty } = useAppStore()
  const toast = useToast()

  const runQuery = useCallback(async () => {
    if (!activeTab || !activeTab.connectionId || queryRunning) return
    const sql = activeTab.content.trim()
    if (!sql) return

    setQueryRunning(true)
    const startTime = Date.now()
    try {
      const result = await QueryDB(activeTab.connectionId, sql) as QueryResult
      result.executionTime = Date.now() - startTime
      setLastQueryResult(result)
      EventBus.emit(Events.QUERY_COMPLETED, { connId: activeTab.connectionId!, rows: result.rows?.length ?? 0, duration: result.executionTime ?? 0 })
      EventBus.emit(Events.FOCUS_PANEL, 'results')
      toast.success(`Query completed in ${result.executionTime}ms — ${result.rows?.length ?? 0} rows`)

      // Save to history (non-critical)
      try {
        await AddQueryHistory(activeTab.connectionId!, sql, 'success', result.rows?.length ?? 0, result.executionTime ?? 0)
        EventBus.emit(Events.HISTORY_UPDATED)
      } catch (err) {
        logError(err, { ...CTX, operation: 'saveQueryHistory', severity: 'low', details: { connId: activeTab.connectionId } })
      }
    } catch (err: unknown) {
      const duration = Date.now() - startTime
      const errResult: QueryResult = { columns: [], rows: [], rowsAffected: 0, error: String(err), executionTime: duration }
      setLastQueryResult(errResult)
      EventBus.emit(Events.QUERY_ERROR, { connId: activeTab.connectionId!, error: String(err) })
      toast.error(`Query failed: ${String(err)}`)

      // Save failed query to history (non-critical)
      try {
        await AddQueryHistory(activeTab.connectionId!, sql, 'error', 0, duration)
        EventBus.emit(Events.HISTORY_UPDATED)
      } catch (historyErr) {
        logError(historyErr, { ...CTX, operation: 'saveFailedQueryHistory', severity: 'low' })
      }
    } finally {
      setQueryRunning(false)
    }
  }, [activeTab, queryRunning, setQueryRunning, setLastQueryResult])

  // Listen for external query refresh events
  useEventBus(Events.QUERY_REFRESH, () => { runQuery() }, [runQuery])

  // Handle keyboard shortcuts (F5, Ctrl+Enter, Ctrl+S)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey
      if (e.key === 'F5' || (isCmdOrCtrl && e.key === 'Enter')) { e.preventDefault(); runQuery() }
      if (isCmdOrCtrl && (e.key === 's' || e.key === 'S')) { e.preventDefault(); if (activeTab) markTabDirty(activeTab.id, false) }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [runQuery, activeTab, markTabDirty])

  // Handle autoRun
  useEffect(() => {
    if (activeTab?.autoRun && !queryRunning) {
      useAppStore.setState((s) => ({ tabs: s.tabs.map((t) => (t.id === activeTab.id ? { ...t, autoRun: false } : t)) }))
      runQuery()
    }
  }, [activeTab?.id, activeTab?.autoRun, queryRunning, runQuery])

  return { runQuery, queryRunning }
}
