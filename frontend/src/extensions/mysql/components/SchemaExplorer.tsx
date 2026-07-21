/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { PanelProps } from '@core/extensions'

/**
 * MySQL Schema Explorer — tree view of databases, tables, columns.
 */
export const SchemaExplorer: React.FC<PanelProps> = ({ panelId: _panelId, isActive: _isActive }) => {
  return (
    <div className="schema-explorer">
      <div className="schema-explorer-toolbar">
        <input
          type="text"
          placeholder="Filter tables..."
          className="schema-filter-input"
        />
      </div>
      <div className="schema-explorer-tree">
        <p style={{ padding: '12px', color: 'var(--color-fg-muted)', fontSize: '12px' }}>
          Connect to a MySQL database to browse its schema.
        </p>
      </div>
    </div>
  )
}
