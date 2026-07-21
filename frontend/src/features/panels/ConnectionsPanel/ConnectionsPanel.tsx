/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState } from 'react'
import { useAppStore } from '@core/state/store'
import type { ConnectionConfig } from '@core/types'
import { ConnectionForm } from '@extensions/registry/mysql/components/connection'
import { ConnectionManager } from '@core/connections/ConnectionManager'
import { EventBus, Events } from '@core/events/EventBus'
import { DeleteConnection } from '@bindings/clientdb/stateservice'
import { getLanguageForDbType } from '@shared/utils'
import { DEFAULT_QUERY_CONTENT } from '@shared/constants/defaults'
import { useToast, ErrorBoundary } from '@shared/components'
import { Icon, DbIcon, getDbColor } from '@primitives'
import { Button, IconButton } from '@primitives'
import { BasePanel } from '@base/BasePanel'
import { BaseEmpty } from '@base/BaseEmpty'
import { Modal } from '@core/modal'
import './ConnectionsPanel.css'

export const ConnectionsPanel: React.FC<{ panelId: string }> = ({ panelId }) => {
  const savedConnections = useAppStore((s) => s.savedConnections)
  const activeConnections = useAppStore((s) => s.activeConnections)
  const removeSavedConnection = useAppStore((s) => s.removeSavedConnection)
  const openTab = useAppStore((s) => s.openTab)

  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const handleConnect = async (connConfig: ConnectionConfig) => {
    setConnectingId(connConfig.id)
    try {
      await ConnectionManager.connect(connConfig, false)
      toast.success(`Connected to ${connConfig.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to connect: ${msg}`)
    } finally {
      setConnectingId(null)
    }
  }

  const handleDelete = async (connId: string) => {
    const connName = savedConnections.find((c) => c.id === connId)?.name ?? connId
    removeSavedConnection(connId)
    try {
      await DeleteConnection(connId)
      toast.success(`Removed ${connName}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to remove ${connName}: ${msg}`)
    }
  }

  return (
    <BasePanel panelId={panelId} className="connections-panel">
      <div className="cp-toolbar">
        <Button variant="primary" size="sm" icon="plus" block onClick={() => setShowForm(true)}>New Connection</Button>
      </div>

      <div className="cp-section-label">SAVED CONNECTIONS</div>

      {savedConnections.length === 0 ? (
        <BaseEmpty icon="plug" title="No saved connections" subtitle="Click &quot;New Connection&quot; to start" />
      ) : (
        <div className="cp-conn-list">
          {savedConnections.map((conn) => {
            const active = activeConnections[conn.id]
            const isConnected = active?.status === 'connected'
            const isConnecting = connectingId === conn.id

            return (
              <div
                key={conn.id}
                className={`cp-conn-item ${isConnected ? 'cp-connected' : ''}`}
                style={{ '--db-brand': getDbColor(conn.type) } as React.CSSProperties}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.cp-conn-actions-always')) return
                  if (isConnecting) return
                  if (isConnected) {
                    EventBus.emit(Events.FOCUS_PANEL, 'explorer')
                    EventBus.emit(Events.SELECT_CONNECTION, { connId: conn.id })
                  } else {
                    handleConnect(conn)
                  }
                }}
              >
                <div className="cp-conn-watermark"><DbIcon type={conn.type} size={140} /></div>
                <div className="cp-conn-row cp-conn-header">
                  {isConnecting ? (
                    <Icon name="loader" size={10} className="cp-spin" />
                  ) : (
                    <div className={`cp-status-dot ${isConnected ? 'connected' : active?.status === 'error' ? 'error' : 'disconnected'}`} />
                  )}
                  <DbIcon type={conn.type} size={24} className="cp-db-icon" />
                  <div className="cp-conn-name">{conn.name}</div>
                  <div className="cp-conn-actions-always">
                    {isConnected && (
                      <IconButton icon="file-plus" size={13} title="New Query" onClick={(e) => {
                        e.stopPropagation()
                        openTab({
                          title: `Query — ${conn.name}`,
                          connectionId: conn.id,
                          dbType: conn.type,
                          language: getLanguageForDbType(conn.type),
                          content: DEFAULT_QUERY_CONTENT,
                          isDirty: false,
                        })
                      }} />
                    )}
                    <IconButton icon="trash" size={13} danger title="Remove" disabled={isConnecting} onClick={(e) => { e.stopPropagation(); handleDelete(conn.id) }} />
                  </div>
                </div>
                <div className="cp-conn-details">
                  {conn.type === 'sqlite' ? (
                    <span className="cp-detail-item"><Icon name="database" size={10} className="cp-detail-icon" />{conn.database}</span>
                  ) : (
                    <>
                      <span className="cp-detail-item"><Icon name="server" size={10} className="cp-detail-icon" />{conn.host}:{conn.port}</span>
                      {conn.database && <span className="cp-detail-item"><Icon name="database" size={10} className="cp-detail-icon" />{conn.database}</span>}
                    </>
                  )}
                  {conn.ssh && <span className="cp-detail-item"><Icon name="lock" size={10} className="cp-detail-icon" />SSH</span>}
                  {conn.connectionString && <span className="cp-detail-item"><Icon name="code" size={10} className="cp-detail-icon" />Connection String</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} size="md">
        <ErrorBoundary module="ConnectionForm">
          <ConnectionForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </ErrorBoundary>
      </Modal>
    </BasePanel>
  )
}
