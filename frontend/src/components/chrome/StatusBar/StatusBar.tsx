/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { useAppStore } from '@core/state/store'
import { ThemeEngine } from '@core/theme/ThemeEngine'
import { getLanguageForDbType } from '@shared/utils'
import { DEFAULT_QUERY_CONTENT } from '@shared/constants/defaults'
import { useToast } from '@shared/components'
import { Icon } from '@primitives'
import { ConnectionManager } from '@core/connections/ConnectionManager'
import './StatusBar.css'

interface Props {
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const StatusBar: React.FC<Props> = ({ position = 'bottom' }) => {
  const activeConnections = useAppStore((s) => s.activeConnections)
  const queryRunning = useAppStore((s) => s.queryRunning)
  const lastQueryResult = useAppStore((s) => s.lastQueryResult)
  const themeId = useAppStore((s) => s.themeId)
  const setThemeId = useAppStore((s) => s.setThemeId)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const savedConnections = useAppStore((s) => s.savedConnections)
  const openTab = useAppStore((s) => s.openTab)

  const toast = useToast()
  const connectedCount = Object.values(activeConnections).filter((c) => c.status === 'connected').length
  const themes = ThemeEngine.getThemes()

  const cycleTheme = () => {
    const idx = themes.findIndex((t) => t.id === themeId)
    const next = themes[(idx + 1) % themes.length]
    setThemeId(next.id)
    ThemeEngine.applyTheme(next.id)
  }

  const handleConnectionSelect = async (connId: string) => {
    const config = savedConnections.find((c) => c.id === connId)
    if (!config) return

    if (!activeConnections[connId]) {
      try {
        await ConnectionManager.connect(config, true)
        toast.success(`Connected to ${config.name}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error(`Failed to connect to ${config.name}: ${msg}`)
      }
    } else {
      openTab({
        title: `Query — ${config.name}`,
        connectionId: connId,
        dbType: config.type,
        language: getLanguageForDbType(config.type),
        content: DEFAULT_QUERY_CONTENT,
        isDirty: false,
        icon: config.type,
      })
    }
  }

  const isHorizontal = position === 'top' || position === 'bottom'

  return (
    <div className={`status-bar sb-${position} ${isHorizontal ? 'sb-horizontal' : 'sb-vertical'}`}>
      <div className="sb-group sb-left">
        <button className="sb-item sb-item-btn" onClick={() => setCommandPaletteOpen(true)} title="Command Palette (Ctrl+Shift+P)">
          <Icon name="command" size={12} /><span>DBSutra</span>
        </button>
        <div className="sb-separator" />
        <div className="sb-item sb-select-wrapper">
          <span className={`sb-dot ${connectedCount > 0 ? 'sb-dot-green' : ''}`} />
          <select className="sb-select" value="" onChange={(e) => handleConnectionSelect(e.target.value)}>
            <option value="" disabled hidden>{connectedCount} connection{connectedCount !== 1 ? 's' : ''}</option>
            {savedConnections.map((c) => {
              const isConnected = !!activeConnections[c.id]
              return <option key={c.id} value={c.id}>{isConnected ? '🟢' : '⚪'} {c.name}</option>
            })}
          </select>
        </div>
      </div>

      <div className="sb-group sb-right">
        {queryRunning && (
          <span className="sb-item sb-running"><Icon name="loader" size={12} className="sb-spin" />Running</span>
        )}
        {lastQueryResult && !queryRunning && !lastQueryResult.error && (
          <span className="sb-item sb-success">
            <Icon name="check" size={12} />
            {lastQueryResult.rows ? lastQueryResult.rows.length : 0} rows
            {lastQueryResult.executionTime !== undefined && ` · ${lastQueryResult.executionTime}ms`}
          </span>
        )}
        {lastQueryResult?.error && (
          <span className="sb-item sb-error"><Icon name="warning" size={12} />Error</span>
        )}
        <div className="sb-separator" />
        <button className="sb-item sb-item-btn" onClick={cycleTheme} title="Switch Theme">
          <Icon name={themeId === 'light' ? 'sun' : 'moon'} size={12} />
          <span>{ThemeEngine.getCurrentTheme()?.name ?? themeId}</span>
        </button>
      </div>
    </div>
  )
}
