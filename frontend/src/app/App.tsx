/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react'
import DockLayout, { LayoutData, TabData } from 'rc-dock'
import 'rc-dock/dist/rc-dock-dark.css'
import { ActivityBar } from '@chrome/ActivityBar'
import { StatusBar } from '@chrome/StatusBar'
import { CommandPalette } from '@chrome/CommandPalette'
import { useAppStore } from '@core/state/store'
import { Events } from '@core/events/EventBus'
import { useEventBus } from '@shared/hooks'
import { Icon } from '@primitives'
import { applyDockPatch, registerPanels, DOCK_GROUPS, loadTab, buildDefaultLayout, debouncedSaveLayout } from './dock'
import { bootstrapApp } from './bootstrap'
import './App.css'

// Apply rc-dock patch once at module load
applyDockPatch()

// Register all panels once at module load (before first render)
registerPanels()

let bootstrapped = false

// ─── Focus ring management ────────────────────────────────────────
function updateFocusRing(focusedPanelId: string | null) {
  document.querySelectorAll('.dock-panel.panel-focused').forEach((el) => {
    el.classList.remove('panel-focused')
  })
  if (focusedPanelId) {
    const panels = document.querySelectorAll('.dock-panel')
    for (const panel of panels) {
      const tabContent = panel.querySelector(`[data-panel-id="${focusedPanelId}"]`)
      if (tabContent) {
        panel.classList.add('panel-focused')
        break
      }
    }
  }
}

const App: React.FC = () => {
  const dockRef = useRef<DockLayout>(null)
  const [restoredLayout, setRestoredLayout] = useState<LayoutData | null>(null)
  const [ready, setReady] = useState(false)
  const panelConfig = useAppStore((s) => s.panelConfigState)
  const appearance = useAppStore((s) => s.appearance)
  const layoutKey = useAppStore((s) => s.layoutKey)
  const focusedPanelId = useAppStore((s) => s.focusedPanelId)

  useEffect(() => {
    if (!bootstrapped) {
      bootstrapped = true
      console.info('[App] Starting bootstrap...')
      bootstrapApp()
        .then((savedLayout) => {
          if (savedLayout) setRestoredLayout(savedLayout)
          setReady(true)
          console.info('[App] Bootstrap succeeded')
        })
        .catch((err) => {
          console.error('[App] Bootstrap FAILED — app will continue with defaults:', {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
          })
          setReady(true)
        })
    } else {
      setReady(true)
    }
  }, [])

  // Handle programmatic panel focus
  useEventBus(Events.FOCUS_PANEL, (panelId) => {
    if (typeof panelId !== 'string' || !dockRef.current) return

    if (panelId === 'minimize') return

    if (panelId.startsWith('maximize:')) {
      const targetId = panelId.replace('maximize:', '')
      const tab = dockRef.current.find(targetId)
      if (tab && 'id' in tab) {
        dockRef.current.updateTab(targetId, tab as TabData, true)
      }
      return
    }

    const tab = dockRef.current.find(panelId)
    if (tab && 'id' in tab && tab.id === panelId) {
      dockRef.current.updateTab(panelId, tab as TabData, true)
    }

    useAppStore.getState().setFocusedPanelId(panelId)
  })

  // Update focus ring when focused panel changes
  useEffect(() => {
    updateFocusRing(focusedPanelId)
  }, [focusedPanelId])

  const onLayoutChange = useCallback((newLayout: LayoutData) => {
    try {
      debouncedSaveLayout(JSON.stringify(newLayout))
    } catch (err) {
      console.warn('[App] Layout save failed:', err)
    }
  }, [])

  // Bar positions from config
  const activityBarPos = panelConfig.activity_bar_position || 'left'
  const statusBarPos = panelConfig.status_bar_position || 'bottom'
  const activityBarVisible = panelConfig.activity_bar_visible !== 'false'
  const statusBarVisible = panelConfig.status_bar_visible !== 'false'

  if (!ready) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="loader" size={24} className="sb-spin" />
      </div>
    )
  }

  const activityBar = activityBarVisible
    ? <ActivityBar dockRef={dockRef} position={activityBarPos as 'left' | 'right' | 'top' | 'bottom'} />
    : null
  const statusBar = statusBarVisible
    ? <StatusBar position={statusBarPos as 'top' | 'bottom' | 'left' | 'right'} />
    : null
  const isOuterColumn = statusBarPos === 'top' || statusBarPos === 'bottom'
  const isInnerColumn = activityBarPos === 'top' || activityBarPos === 'bottom'

  return (
    <div className="app-root" style={{ flexDirection: isOuterColumn ? 'column' : 'row' }}>
      {statusBarPos === 'top' && statusBar}
      {statusBarPos === 'left' && statusBar}

      <div className="app-body" style={{ flexDirection: isInnerColumn ? 'column' : 'row' }}>
        {activityBarPos === 'top' && activityBar}
        {activityBarPos === 'left' && activityBar}

        <div className="app-workspace">
          <DockLayout
            key={layoutKey}
            ref={dockRef}
            dropMode="edge"
            groups={DOCK_GROUPS}
            defaultLayout={restoredLayout ?? buildDefaultLayout(appearance)}
            loadTab={loadTab}
            saveTab={(t) => ({ id: t.id })}
            onLayoutChange={onLayoutChange}
            style={{ position: 'absolute', inset: 0 }}
          />
        </div>

        {activityBarPos === 'bottom' && activityBar}
        {activityBarPos === 'right' && activityBar}
      </div>

      {statusBarPos === 'bottom' && statusBar}
      {statusBarPos === 'right' && statusBar}

      <CommandPalette />
    </div>
  )
}

export default App
