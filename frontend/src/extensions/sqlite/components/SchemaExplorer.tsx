/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { PanelProps } from '@core/extensions'

export const SchemaExplorer: React.FC<PanelProps> = ({ panelId: _panelId }) => (
  <div className="schema-explorer">
    <div className="schema-explorer-tree">
      <p style={{ padding: '12px', color: 'var(--color-fg-muted)', fontSize: '12px' }}>
        Open a SQLite database file to browse its schema.
      </p>
    </div>
  </div>
)
