/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useEffect, useRef } from 'react'
import type { ActiveConnection, ConnectionConfig } from '@core/types'
import { Icon, DbIcon } from '@primitives'

interface Props {
  savedConnections: ConnectionConfig[]
  activeConnections: Record<string, ActiveConnection>
  activeConnId: string | null
  onChange: (id: string) => void
  isConnecting: boolean
}

export const ConnectionDropdown: React.FC<Props> = ({
  savedConnections, activeConnections, activeConnId, onChange, isConnecting,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeConn = savedConnections.find((c) => c.id === activeConnId)

  return (
    <div className="se-custom-dropdown" ref={dropdownRef}>
      <div className={`se-dropdown-header ${isOpen ? 'open' : ''} ${isConnecting ? 'disabled' : ''}`}
        onClick={() => !isConnecting && setIsOpen(!isOpen)}>
        {activeConn ? (
          <>
            <DbIcon type={activeConn.type} size={16} />
            <span className="se-dropdown-name">{activeConn.name}</span>
            <div className={`se-status-indicator ${activeConnections[activeConn.id]?.status ?? 'disconnected'}`} />
          </>
        ) : (
          <span className="se-dropdown-placeholder">Select a connection...</span>
        )}
        <Icon name="chevron-down" size={14} className="se-dropdown-chevron" />
      </div>
      {isOpen && (
        <div className="se-dropdown-menu">
          {savedConnections.map((c) => {
            const status = activeConnections[c.id]?.status ?? 'disconnected'
            return (
              <div key={c.id} className={`se-dropdown-item ${c.id === activeConnId ? 'selected' : ''}`}
                onClick={() => { onChange(c.id); setIsOpen(false) }}>
                <DbIcon type={c.type} size={16} />
                <span className="se-dropdown-name">{c.name}</span>
                <div className={`se-status-indicator ${status}`} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
