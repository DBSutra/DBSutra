/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { PanelRegistry } from '@core/panels'
import { useAppStore } from '@core/state/store'

/**
 * VS Code-style sidebar.
 * Renders the currently focused panel from the sidebar location.
 */
export const Sidebar: React.FC = () => {
  const focusedPanelId = useAppStore((s) => s.focusedPanelId)

  // Get the panel descriptor
  const panel = focusedPanelId ? PanelRegistry.get(focusedPanelId) : null

  // If no panel focused or panel not found, show the first sidebar panel
  const sidebarPanels = PanelRegistry.getByLocation('sidebar')
  const activePanel = panel ?? sidebarPanels[0]

  if (!activePanel) {
    return (
      <div className="sidebar">
        <div className="sidebar-empty">
          <span>No views available</span>
        </div>
      </div>
    )
  }

  const Component = activePanel.component

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{activePanel.title}</span>
      </div>
      <div className="sidebar-content">
        <Component panelId={activePanel.id} isActive={true} />
      </div>
    </div>
  )
}
