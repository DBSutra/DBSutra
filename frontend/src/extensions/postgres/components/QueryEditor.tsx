/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { PanelProps } from '@core/extensions'

export const QueryEditor: React.FC<PanelProps> = ({ panelId: _panelId }) => (
  <div className="query-editor">
    <div className="query-editor-toolbar">
      <button className="query-run-btn">▶ Run</button>
    </div>
    <div className="query-editor-content">
      <textarea className="query-textarea" placeholder="Enter your PostgreSQL query..." spellCheck={false} />
    </div>
  </div>
)
