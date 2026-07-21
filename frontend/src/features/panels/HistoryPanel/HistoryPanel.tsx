/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useEffect, useState } from 'react'
import { LoadQueryHistory } from '@bindings/clientdb/stateservice'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { useEventBus } from '@shared/hooks'
import { getConnectionById, getLanguageForDbType } from '@shared/utils'
import { Icon } from '@primitives'
import { BasePanel } from '@base/BasePanel'
import { BaseEmpty } from '@base/BaseEmpty'
import './HistoryPanel.css'

interface HistoryEntry {
  connId: string
  query: string
  status: string
  rows: number
  duration: number
  timestamp: number
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts * 1000
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return `${diffSecs}s ago`
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function getConnectionDisplayName(
  savedConnections: ReturnType<typeof useAppStore.getState>['savedConnections'],
  activeConnections: ReturnType<typeof useAppStore.getState>['activeConnections'],
  connId: string
): string {
  const conn = getConnectionById(savedConnections, activeConnections, connId)
  return conn?.name ?? `${connId.substring(0, 8)}...`
}

export const HistoryPanel: React.FC<{ panelId: string }> = ({ panelId }) => {
  const { openTab, savedConnections, activeConnections } = useAppStore()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const toggleExpand = (key: string) => {
    setExpandedQueries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const fetchHistory = async () => {
    try {
      const json = await LoadQueryHistory(100)
      if (json) {
        const parsed = JSON.parse(json)
        if (Array.isArray(parsed)) setHistory(parsed)
      }
    } catch (err) {
      // Silently handle - service may not be ready during initialization
      console.debug('[HistoryPanel] Could not load query history:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Delay initial fetch to allow services to initialize
    const timer = setTimeout(fetchHistory, 500)
    return () => clearTimeout(timer)
  }, [])
  useEventBus(Events.HISTORY_UPDATED, fetchHistory)

  const handleRun = (item: HistoryEntry) => {
    const conn = getConnectionById(savedConnections, activeConnections, item.connId)
    if (!conn) return
    openTab({
      title: 'Query',
      connectionId: item.connId,
      dbType: conn.type,
      language: getLanguageForDbType(conn.type),
      content: item.query,
      isDirty: false,
      autoRun: true,
      icon: 'play',
    })
    EventBus.emit(Events.FOCUS_PANEL, 'editor')
  }

  const handleEdit = (item: HistoryEntry) => {
    const conn = getConnectionById(savedConnections, activeConnections, item.connId)
    openTab({
      title: 'Query',
      connectionId: item.connId,
      dbType: conn?.type,
      language: getLanguageForDbType(conn?.type ?? ''),
      content: item.query,
      isDirty: true,
      icon: 'code',
    })
    EventBus.emit(Events.FOCUS_PANEL, 'editor')
  }

  if (isLoading) {
    return (
      <BasePanel panelId={panelId} className="history-panel">
        <div className="hp-loading">
          <Icon name="loader" size={24} className="hp-spin" />
          <span>Loading history...</span>
        </div>
      </BasePanel>
    )
  }

  if (history.length === 0) {
    return (
      <BasePanel panelId={panelId} className="history-panel">
        <BaseEmpty icon="history" title="No Query History" subtitle="Your executed queries will appear here" />
      </BasePanel>
    )
  }

  return (
    <BasePanel panelId={panelId} className="history-panel">
      <div className="hp-list">
        {history.map((item, i) => {
          const key = `${item.timestamp}-${i}`
          const isExpanded = expandedQueries.has(key)
          return (
            <div key={key} className={`hp-item ${isExpanded ? 'is-expanded' : ''}`}>
              <div className="hp-header">
                <div className="hp-meta">
                  <div className={`hp-status ${item.status === 'success' ? 'success' : 'error'}`} title={item.status} />
                  <div className="hp-conn" title={item.connId}>{getConnectionDisplayName(savedConnections, activeConnections, item.connId)}</div>
                </div>
                <div className="hp-stats" title={`${item.rows} rows returned in ${item.duration}ms`}>
                  <span className="hp-time">{formatRelativeTime(item.timestamp)}</span>
                </div>
                <div className="hp-actions">
                  <button className="hp-btn" title="Edit" onClick={() => handleEdit(item)}><Icon name="edit" size={14} /></button>
                  <button className="hp-btn" title="Run" onClick={() => handleRun(item)}><Icon name="play" size={14} /></button>
                </div>
              </div>
              <div className={`hp-query-container ${isExpanded ? 'expanded' : ''}`}>
                <div className="hp-query">{item.query}</div>
                <button className="hp-btn hp-expander" title="Expand/Collapse" onClick={() => toggleExpand(key)}>
                  <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </BasePanel>
  )
}
