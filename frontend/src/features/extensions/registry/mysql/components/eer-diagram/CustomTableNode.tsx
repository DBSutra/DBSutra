/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// React is used implicitly by JSX — no import needed with react-jsx transform
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { SchemaColumn } from '@core/types'
import { Icon } from '@primitives'

interface TableNodeData {
  label: string
  columns: SchemaColumn[]
}

export const CustomTableNode = ({ data }: NodeProps) => {
  const columns = (data as unknown as TableNodeData).columns ?? []
  return (
    <div className="eer-table-node">
      <div className="eer-table-header">
        <Icon name="workflow" size={14} className="eer-table-icon" />
        <span className="eer-table-title">{data.label as string}</span>
      </div>
      <div className="eer-table-columns">
        {columns.map((col, i) => (
          <div key={i} className="eer-column-row">
            <span className={`eer-col-key ${col.key === 'PRI' ? 'eer-col-pk' : ''}`}>
              <Icon name={col.key === 'PRI' ? 'key' : 'circle'} size={10} />
            </span>
            <span className="eer-col-name">{col.name}</span>
            <span className="eer-col-type">{col.type}</span>
            <Handle type="source" position={Position.Right} id={`${col.name}-source`} className="eer-handle" />
            <Handle type="target" position={Position.Left} id={`${col.name}-target`} className="eer-handle" />
          </div>
        ))}
      </div>
    </div>
  )
}

export const nodeTypes = { tableNode: CustomTableNode }
