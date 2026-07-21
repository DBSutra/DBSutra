/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { DatabaseType } from '@core/types'
import { DbIcon } from '@primitives'
import { DB_DEFAULTS, ALL_DB_TYPES } from '@config/defaults'

interface Props {
  selected: DatabaseType
  onSelect: (type: DatabaseType) => void
}

export const DatabaseTypeSelector: React.FC<Props> = ({ selected, onSelect }) => (
  <div className="cf-field">
    <label>Database Type</label>
    <div className="cf-db-types">
      {ALL_DB_TYPES.map((t) => (
        <button
          key={t}
          className={`cf-db-type-btn ${selected === t ? 'active' : ''}`}
          onClick={() => onSelect(t)}
        >
          <DbIcon type={t} size={22} />
          <span>{DB_DEFAULTS[t].label}</span>
        </button>
      ))}
    </div>
  </div>
)
