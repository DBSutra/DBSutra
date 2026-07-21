/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { PanelProps } from '@core/extensions'

/**
 * MySQL Query Editor — SQL editor with syntax highlighting.
 */
export const QueryEditor: React.FC<PanelProps> = ({ panelId: _panelId, isActive: _isActive }) => {
  return (
    <div className="query-editor">
      <div className="query-editor-toolbar">
        <button className="query-run-btn" title="Run Query (F5)">
          ▶ Run
        </button>
      </div>
      <div className="query-editor-content">
        <textarea
          className="query-textarea"
          placeholder="Enter your SQL query here..."
          spellCheck={false}
        />
      </div>
    </div>
  )
}
