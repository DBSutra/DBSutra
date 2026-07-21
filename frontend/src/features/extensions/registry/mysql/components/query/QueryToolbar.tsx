/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'

interface Props {
  onSave: () => void
  onRun: () => void
  queryRunning: boolean
  hasConnection: boolean
  children?: React.ReactNode
}

export const QueryToolbar: React.FC<Props> = ({ onSave, onRun, queryRunning, hasConnection, children }) => (
  <div className="qe-toolbar">
    <div className="qe-toolbar-left">
      <button className="qe-save-btn" onClick={onSave} title="Save Query (Remove Dirty State)">
        <Icon name="save" size={13} /><span>Save</span>
      </button>
    </div>
    <div className="qe-toolbar-spacer" />
    {children}
    <button className={`qe-run-btn ${queryRunning ? 'qe-running' : ''}`} onClick={onRun} disabled={queryRunning || !hasConnection} title="Run Query (F5 or Ctrl+Enter)">
      {queryRunning ? <Icon name="loader" size={13} className="qe-spin" /> : <><Icon name="play" size={13} /><span>Run</span></>}
    </button>
  </div>
)
