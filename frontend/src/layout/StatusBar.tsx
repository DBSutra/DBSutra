/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { useAppStore } from '@core/state/store'
import { Icon } from '@primitives'

/**
 * VS Code-style status bar.
 */
export const StatusBar: React.FC = () => {
  const activeConnections = useAppStore((s) => s.activeConnections)
  const queryRunning = useAppStore((s) => s.queryRunning)
  const connectionCount = Object.keys(activeConnections).length

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <button
          className="status-bar-item clickable"
          onClick={() => useAppStore.getState().setCommandPaletteOpen(true)}
          title="Command Palette"
        >
          <Icon name="terminal" size={12} />
        </button>

        {connectionCount > 0 && (
          <span className="status-bar-item">
            <Icon name="database" size={12} />
            {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
          </span>
        )}

        {queryRunning && (
          <span className="status-bar-item">
            <Icon name="loader" size={12} className="sb-spin" />
            Running...
          </span>
        )}
      </div>

      <div className="status-bar-right">
        <button
          className="status-bar-item clickable"
          onClick={() => useAppStore.getState().setCommandPaletteOpen(true)}
          title="Toggle Theme"
        >
          <Icon name="palette" size={12} />
        </button>
      </div>
    </div>
  )
}
