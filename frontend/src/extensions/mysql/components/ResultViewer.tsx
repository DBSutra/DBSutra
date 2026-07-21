/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { PanelProps } from '@core/extensions'

/**
 * MySQL Result Viewer — table display for query results.
 */
export const ResultViewer: React.FC<PanelProps> = ({ panelId: _panelId, isActive: _isActive }) => {
  return (
    <div className="result-viewer">
      <div className="result-viewer-status">
        <span>No results</span>
      </div>
      <div className="result-viewer-table">
        <p style={{ padding: '12px', color: 'var(--color-fg-muted)', fontSize: '12px' }}>
          Run a query to see results here.
        </p>
      </div>
    </div>
  )
}
