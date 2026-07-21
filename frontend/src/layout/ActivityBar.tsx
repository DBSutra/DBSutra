/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'
import { PanelRegistry } from '@core/panels'
import { useAppStore } from '@core/state/store'
import type { PanelDescriptor } from '@core/panels'

interface ActivityBarProps {
  onToggleSidebar: () => void
  sidebarVisible: boolean
}

/**
 * VS Code-style activity bar.
 * Renders icon buttons for sidebar view groups.
 */
export const ActivityBar: React.FC<ActivityBarProps> = ({
  onToggleSidebar,
  sidebarVisible,
}) => {
  const focusedPanelId = useAppStore((s) => s.focusedPanelId)

  // Get panels that are in the activity bar or sidebar
  const activityPanels = PanelRegistry.getByLocation('activitybar')
  const sidebarPanels = PanelRegistry.getByLocation('sidebar')

  // Group sidebar panels by group
  const groups = new Map<string, PanelDescriptor[]>()
  for (const panel of sidebarPanels) {
    const group = panel.group ?? 'general'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(panel)
  }

  const handlePanelClick = (panelId: string) => {
    if (focusedPanelId === panelId) {
      onToggleSidebar()
    } else {
      useAppStore.getState().setFocusedPanelId(panelId)
      if (!sidebarVisible) onToggleSidebar()
    }
  }

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {activityPanels.map((panel) => (
          <button
            key={panel.id}
            className={`activity-bar-item ${focusedPanelId === panel.id ? 'active' : ''}`}
            onClick={() => handlePanelClick(panel.id)}
            title={panel.title}
          >
            <Icon name={panel.icon} size={20} />
          </button>
        ))}

        {Array.from(groups.entries()).map(([_group, panels]) =>
          panels.map((panel) => (
            <button
              key={panel.id}
              className={`activity-bar-item ${focusedPanelId === panel.id ? 'active' : ''}`}
              onClick={() => handlePanelClick(panel.id)}
              title={panel.title}
            >
              <Icon name={panel.icon} size={20} />
            </button>
          ))
        )}
      </div>

      <div className="activity-bar-bottom">
        <button
          className="activity-bar-item"
          onClick={() => handlePanelClick('settings')}
          title="Settings"
        >
          <Icon name="settings" size={20} />
        </button>
      </div>
    </div>
  )
}
