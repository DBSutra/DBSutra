/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// React is used implicitly by JSX — no import needed with react-jsx transform
import type { TabData, TabGroup } from 'rc-dock'
import { PanelManager } from '@core/panels/PanelManager'
import { Icon } from '@primitives'

// rc-dock tab groups — controls drag/drop rules
export const DOCK_GROUPS: Record<string, TabGroup> = {
  card: {
    maximizable: true,
    tabLocked: false,
    animated: true,
  },
}

/**
 * Creates a TabData object for rc-dock from a panel ID.
 * Used for building default layout and restoring panels.
 */
export function createDockTab(id: string): TabData | undefined {
  const def = PanelManager.get(id)
  if (!def) return undefined
  const Component = def.component
  return {
    id: def.id,
    title: (
      <span className="dock-tab-title">
        <Icon name={def.icon} size={13} />
        <span>{def.title}</span>
      </span>
    ),
    content: (
      <div className="panel-scroll-container" data-panel-id={def.id}>
        <Component panelId={def.id} />
      </div>
    ),
    closable: def.closable ?? true,
    group: 'card',
  }
}

/**
 * rc-dock loadTab callback — restores tabs from serialized layout.
 */
export function loadTab(data: { id?: string }): TabData {
  const id = data.id ?? ''
  const tab = createDockTab(id)
  if (tab) return tab
  return {
    id,
    title: id,
    content: <div className="panel-placeholder"><div className="panel-placeholder-title">{id}</div></div>,
    closable: true,
  }
}
