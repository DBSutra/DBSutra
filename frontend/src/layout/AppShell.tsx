/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useCallback } from 'react'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { EditorArea } from './EditorArea'
import { PanelArea } from './PanelArea'
import { StatusBar } from './StatusBar'

/**
 * VS Code-style application shell.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    [Title Bar - native]                      │
 * ├────┬──────────┬─────────────────────────────┬───────────────┤
 * │    │ Primary  │                             │               │
 * │ A  │ Sidebar  │      Editor Area            │  (optional    │
 * │ c  │ (views)  │    (tabs, splits)           │   secondary   │
 * │ t  │          │                             │   sidebar)    │
 * │ i  │          │                             │               │
 * │ v  │          │                             │               │
 * │ i  │          ├─────────────────────────────┤               │
 * │ t  │          │      Panel Area             │               │
 * │ y  │          │   (terminal, output, etc.)  │               │
 * │    │          │                             │               │
 * │ B  │          │                             │               │
 * │ a  │          │                             │               │
 * │ r  │          │                             │               │
 * ├────┴──────────┴─────────────────────────────┴───────────────┤
 * │                    Status Bar                               │
 * └─────────────────────────────────────────────────────────────┘
 */
export const AppShell: React.FC = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [panelVisible] = useState(true)

  const handleToggleSidebar = useCallback(() => {
    setSidebarVisible((v) => !v)
  }, [])

  return (
    <div className="app-shell">
      <div className="app-shell-body">
        <ActivityBar
          onToggleSidebar={handleToggleSidebar}
          sidebarVisible={sidebarVisible}
        />

        <div className="app-shell-content">
          <Allotment proportionalLayout={false}>
            {/* Sidebar */}
            {sidebarVisible && (
              <Allotment.Pane minSize={180} maxSize={500} preferredSize={260}>
                <Sidebar />
              </Allotment.Pane>
            )}

            {/* Editor + Panel area */}
            <Allotment.Pane>
              <Allotment vertical proportionalLayout={false}>
                {/* Editor Area */}
                <Allotment.Pane minSize={100}>
                  <EditorArea />
                </Allotment.Pane>

                {/* Panel Area */}
                {panelVisible && (
                  <Allotment.Pane minSize={100} preferredSize={250}>
                    <PanelArea />
                  </Allotment.Pane>
                )}
              </Allotment>
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
