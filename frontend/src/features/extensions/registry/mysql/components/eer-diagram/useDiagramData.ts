/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useMemo } from 'react'
import { useNodesState, useEdgesState, MarkerType } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import { useAppStore } from '@core/state/store'

export function useDiagramData() {
  const { activeEerDiagram, schemaCache } = useAppStore()

  const schema = useMemo(() => {
    if (!activeEerDiagram) return null
    const dbs = schemaCache[activeEerDiagram.connId] || []
    return dbs.find((d) => d.name === activeEerDiagram.database) || null
  }, [activeEerDiagram, schemaCache])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useMemo(() => {
    if (!schema) { setNodes([]); setEdges([]); return }

    const generatedNodes: Node[] = []
    const generatedEdges: Edge[] = []
    const cols = Math.ceil(Math.sqrt(schema.tables.length))
    const spacingX = 350
    const spacingY = 350

    schema.tables.forEach((table, index) => {
      const x = (index % cols) * spacingX
      const y = Math.floor(index / cols) * spacingY
      generatedNodes.push({ id: table.name, type: 'tableNode', position: { x, y }, data: { label: table.name, columns: table.columns } })

      table.columns.forEach((col) => {
        if (col.name.endsWith('_id')) {
          const targetTable = col.name.replace(/_id$/, 's')
          if (schema.tables.some((t) => t.name === targetTable)) {
            generatedEdges.push({
              id: `e-${table.name}-${col.name}-${targetTable}-id`,
              source: targetTable, sourceHandle: 'id-source',
              target: table.name, targetHandle: `${col.name}-target`,
              type: 'smoothstep', animated: true,
              label: `${col.name} → id`,
              labelStyle: { fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 500 },
              labelBgStyle: { fill: 'var(--color-bg-overlay)', color: 'var(--color-text-muted)', fillOpacity: 0.8 },
              style: { stroke: 'var(--color-accent-blue)', strokeWidth: 1.5, opacity: 0.7 },
              markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: 'var(--color-accent-blue)' },
            })
          }
        }
      })
    })

    setNodes(generatedNodes)
    setEdges(generatedEdges)
  }, [schema, setNodes, setEdges])

  return { activeEerDiagram, schema, nodes, edges, onNodesChange, onEdgesChange }
}
