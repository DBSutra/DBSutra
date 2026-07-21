/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { RefObject } from 'react'
import DockLayout from 'rc-dock'
import { Icon } from '@primitives'
import { PanelManager } from '@core/panels/PanelManager'
import './ActivityBar.css'

interface Props {
  dockRef: RefObject<DockLayout | null>
  position: 'left' | 'right' | 'top' | 'bottom'
}

export const ActivityBar: React.FC<Props> = ({ dockRef, position }) => {
  const handleClick = (id: string) => {
    const dock = dockRef.current
    if (!dock) return

    const existing = dock.find(id)
    if (existing) {
      dock.updateTab(id, null as unknown as Parameters<typeof dock.updateTab>[1], true)
      return
    }

    const def = PanelManager.get(id)
    if (!def) return

    const Component = def.component
    const newTab = {
      id: def.id,
      title: (
        <span className="dock-tab-title">
          <Icon name={def.icon} size={13} />
          <span>{def.title}</span>
        </span>
      ),
      content: (
        <div className="panel-scroll-container">
          <Component panelId={def.id} />
        </div>
      ),
      closable: true,
      group: 'card',
    }

    const connectionsPanel = dock.find('connections')
    const explorerPanel = dock.find('explorer')
    const target = connectionsPanel ?? explorerPanel

    if (target) {
      dock.dockMove(newTab, target, 'middle')
    } else {
      dock.dockMove(newTab, null as unknown as Parameters<typeof dock.dockMove>[1], 'left')
    }
  }

  const allPanels = PanelManager.getAll()
  const isHorizontal = position === 'top' || position === 'bottom'

  return (
    <div className={`activity-bar ab-${position} ${isHorizontal ? 'ab-horizontal' : 'ab-vertical'}`}>
      <div className="ab-group">
        {allPanels.map(def => (
          <button
            key={def.id}
            className="ab-item"
            onClick={() => handleClick(def.id)}
            title={def.title}
          >
            <Icon name={def.icon} size={20} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  )
}
