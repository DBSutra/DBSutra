/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { PanelRegistry } from '@core/panels'
import { useAppStore } from '@core/state/store'
import { Icon } from '@primitives'

/**
 * VS Code-style bottom panel area.
 * Shows results, terminal, output, problems, etc.
 */
export const PanelArea: React.FC = () => {
  const focusedPanelId = useAppStore((s) => s.focusedPanelId)

  // Get panels in the panel location
  const panelPanels = PanelRegistry.getByLocation('panel')

  // Default to results panel
  const activePanelId = focusedPanelId ?? panelPanels[0]?.id
  const activePanel = activePanelId ? PanelRegistry.get(activePanelId) : null

  return (
    <div className="panel-area">
      <div className="panel-area-tabs">
        {panelPanels.map((panel) => (
          <button
            key={panel.id}
            className={`panel-area-tab ${panel.id === activePanelId ? 'active' : ''}`}
            onClick={() => useAppStore.getState().setFocusedPanelId(panel.id)}
          >
            <Icon name={panel.icon} size={14} />
            <span>{panel.title}</span>
          </button>
        ))}
      </div>
      <div className="panel-area-content">
        {activePanel ? (
          <activePanel.component panelId={activePanel.id} isActive={true} />
        ) : (
          <div className="panel-area-empty">
            <span>No panels available</span>
          </div>
        )}
      </div>
    </div>
  )
}
