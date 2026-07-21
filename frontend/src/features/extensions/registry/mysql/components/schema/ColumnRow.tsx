/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { SchemaColumn } from '@core/types'
import { Icon } from '@primitives'

export const ColumnRow: React.FC<{ column: SchemaColumn }> = ({ column }) => (
  <div className="se-col-row">
    <span className={`se-col-key ${column.key === 'PRI' ? 'se-col-pk' : ''}`}>
      <Icon name={column.key === 'PRI' ? 'key' : 'circle'} size={10} />
    </span>
    <span className="se-col-name">{column.name}</span>
    <span className="se-col-type">{column.type}</span>
    {!column.nullable && <span className="se-col-nn">NN</span>}
  </div>
)
