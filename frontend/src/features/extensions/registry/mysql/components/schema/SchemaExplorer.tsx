/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useEffect, useRef } from 'react'
import type { SchemaDatabase } from '@core/types'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { ConnectionManager } from '@core/connections/ConnectionManager'
import { logError } from '@shared/utils/errors'
import { useToast } from '@shared/components'
import { Icon } from '@primitives'
import { GetSchema } from '@bindings/clientdb/dbservice'
import { ConnectionDropdown } from './ConnectionDropdown'
import { DatabaseNode } from './DatabaseNode'
import '../SchemaExplorer.css'

interface Props { panelId: string }

export const SchemaExplorer: React.FC<Props> = () => {
  const { schemaCache, activeConnections, savedConnections } = useAppStore()
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoExpanded, setAutoExpanded] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const toast = useToast()
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const defaultActiveId = Object.keys(activeConnections).find((k) => activeConnections[k].status === 'connected')
  const activeConnId = selectedConnId ?? defaultActiveId ?? null
  const activeConn = activeConnId ? activeConnections[activeConnId] : null
  const schema: SchemaDatabase[] = activeConnId ? (schemaCache[activeConnId] ?? []) : []

  useEffect(() => {
    const unsub = EventBus.on(Events.SELECT_CONNECTION as any, ((connId: any) => {
      if (typeof connId === 'string') setSelectedConnId(connId)
    }) as any)
    return unsub
  }, [])

  useEffect(() => {
    if (activeConnId && schema.length > 0 && !autoExpanded.has(activeConnId)) {
      setExpandedDbs((prev) => { const next = new Set(prev); schema.forEach((db) => next.add(`db-${activeConnId}-${db.name}`)); return next })
      setAutoExpanded((prev) => new Set(prev).add(activeConnId))
    }
  }, [activeConnId, schema, autoExpanded])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        if (containerRef.current?.contains(document.activeElement)) {
          e.preventDefault()
          setIsSearchOpen((prev) => { const next = !prev; if (next) setTimeout(() => searchInputRef.current?.focus(), 50); return next })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggle = (set: Set<string>, key: string): Set<string> => { const s = new Set(set); s.has(key) ? s.delete(key) : s.add(key); return s }

  const handleSelectChange = async (id: string) => {
    setSelectedConnId(id)
    const conn = savedConnections.find((c) => c.id === id)
    if (conn && activeConnections[id]?.status !== 'connected') {
      setIsConnecting(true)
      await new Promise((resolve) => setTimeout(resolve, 50))
      try {
        await ConnectionManager.connect(conn, false)
        toast.success(`Connected to ${conn.name}`)
      } catch (err) {
        logError(err, { module: 'SchemaExplorer', operation: 'connect', severity: 'medium', details: { connId: id } })
        toast.error(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
      finally { setIsConnecting(false) }
    }
  }

  const handleRefresh = async () => {
    if (!activeConnId) return
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 50))
    try {
      const refreshedSchema = await GetSchema(activeConnId) as SchemaDatabase[]
      useAppStore.getState().setSchemaCache(activeConnId, refreshedSchema)
      toast.success('Schema refreshed')
    } catch (err) {
      logError(err, { module: 'SchemaExplorer', operation: 'refreshSchema', severity: 'medium', details: { connId: activeConnId } })
      toast.error('Failed to refresh schema')
    }
    finally { setIsRefreshing(false) }
  }

  const filteredSchema = React.useMemo(() => {
    if (!searchQuery) return schema
    const q = searchQuery.toLowerCase()
    return schema.map((db) => {
      if (db.name.toLowerCase().includes(q)) return db
      const filteredTables = db.tables.filter((t) => t.name.toLowerCase().includes(q))
      return filteredTables.length > 0 ? { ...db, tables: filteredTables } : null
    }).filter(Boolean) as SchemaDatabase[]
  }, [schema, searchQuery])

  useEffect(() => {
    if (searchQuery && filteredSchema.length > 0) {
      setExpandedDbs((prev) => { const next = new Set(prev); filteredSchema.forEach((db) => next.add(`db-${activeConnId}-${db.name}`)); return next })
    }
  }, [searchQuery, filteredSchema, activeConnId])

  if (savedConnections.length === 0) {
    return <div className="schema-empty"><Icon name="database" size={28} className="schema-empty-icon" /><div className="schema-empty-title">No Saved Connections</div><div className="schema-empty-sub">Create a connection to explore its schema</div></div>
  }

  return (
    <div className="schema-explorer" ref={containerRef} tabIndex={-1}>
      <div className="se-toolbar">
        <ConnectionDropdown savedConnections={savedConnections} activeConnections={activeConnections} activeConnId={activeConnId} onChange={handleSelectChange} isConnecting={isConnecting} />
        <button className="se-icon-btn" onClick={handleRefresh} disabled={!activeConnId || isConnecting || isRefreshing} title="Refresh Schema">
          <Icon name="refresh" size={14} className={(isConnecting || isRefreshing) ? 'se-spin' : ''} />
        </button>
        <button className={`se-icon-btn ${isSearchOpen ? 'active' : ''}`} onClick={() => { setIsSearchOpen(!isSearchOpen); if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 50) }} title="Search Tables (Cmd+F)">
          <Icon name="search" size={14} />
        </button>
      </div>
      {isSearchOpen && (
        <div className="se-search-bar">
          <Icon name="search" size={13} className="se-search-icon" />
          <input ref={searchInputRef} type="text" placeholder="Search tables..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); setIsSearchOpen(false) } }} />
          {searchQuery && <button className="se-clear-btn" onClick={() => setSearchQuery('')}><Icon name="x" size={13} /></button>}
        </div>
      )}
      {activeConn && activeConn.status === 'connected' && (
        <div className="se-db-list">
          {filteredSchema.length === 0 ? <div className="se-empty">{searchQuery ? 'No matching tables found' : 'No databases found'}</div> : filteredSchema.map((db) => (
            <DatabaseNode key={db.name} db={db} connId={activeConn.id} expandedDbs={expandedDbs} expandedTables={expandedTables} onToggleDb={(k) => setExpandedDbs((prev) => toggle(prev, k))} onToggleTable={(k) => setExpandedTables((prev) => toggle(prev, k))} />
          ))}
        </div>
      )}
    </div>
  )
}
