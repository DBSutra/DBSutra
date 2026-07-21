/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { PanelManager } from '@core/panels/PanelManager'
import { ErrorBoundary } from '@shared/components'
import { Icon } from '@primitives'
import { ConnectionsPanel } from '@panels/ConnectionsPanel'
import { SettingsPanel } from '@panels/SettingsPanel'
import { HistoryPanel } from '@panels/HistoryPanel'
import { PreferencesPanel } from '@panels/PreferencesPanel'
import { SchemaExplorer } from '@extensions/registry/mysql/components/schema'
import { QueryEditor } from '@extensions/registry/mysql/components/query'
import { ResultViewer } from '@extensions/registry/mysql/components/result'
import { RowDetailPanel } from '@extensions/registry/mysql/components/row-detail'
import { EerDiagramPanel } from '@extensions/registry/mysql/components/eer-diagram'

const ExtensionsPanel: React.FC<{ panelId: string }> = () => (
  <div className="panel-placeholder">
    <Icon name="puzzle" size={28} className="panel-placeholder-icon" />
    <div className="panel-placeholder-title">Extensions</div>
    <div className="panel-placeholder-hint">Manage installed extensions</div>
  </div>
)

/** Wraps a component with ErrorBoundary for graceful error handling. */
function withErrorBoundary<P extends { panelId: string }>(Component: React.FC<P>): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  )
  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return Wrapped
}

export function registerPanels(): void {
  PanelManager.register({ id: 'connections', title: 'Connections',     icon: 'plug-zap',  component: withErrorBoundary(ConnectionsPanel), defaultLocation: 'left' })
  PanelManager.register({ id: 'explorer',    title: 'Schema Explorer', icon: 'database',   component: withErrorBoundary(SchemaExplorer),   defaultLocation: 'left' })
  PanelManager.register({ id: 'history',     title: 'History',         icon: 'history',    component: withErrorBoundary(HistoryPanel),     defaultLocation: 'left' })
  PanelManager.register({ id: 'settings',    title: 'Settings',        icon: 'settings',   component: withErrorBoundary(SettingsPanel),    defaultLocation: 'main' })
  PanelManager.register({ id: 'preferences', title: 'Preferences',     icon: 'settings',   component: withErrorBoundary(PreferencesPanel), defaultLocation: 'main' })
  PanelManager.register({ id: 'extensions',  title: 'Extensions',      icon: 'puzzle',     component: withErrorBoundary(ExtensionsPanel),  defaultLocation: 'left' })
  PanelManager.register({ id: 'editor',      title: 'Query Editor',    icon: 'code',       component: withErrorBoundary(QueryEditor),      defaultLocation: 'main', closable: false })
  PanelManager.register({ id: 'results',     title: 'Results',         icon: 'table',      component: withErrorBoundary(ResultViewer),     defaultLocation: 'bottom' })
  PanelManager.register({ id: 'eer-diagram', title: 'EER Diagram',     icon: 'workflow',    component: withErrorBoundary(EerDiagramPanel),  defaultLocation: 'bottom' })
  PanelManager.register({ id: 'row-detail',  title: 'Row Inspector',   icon: 'rows-3',     component: withErrorBoundary(RowDetailPanel),   defaultLocation: 'left' })
}
