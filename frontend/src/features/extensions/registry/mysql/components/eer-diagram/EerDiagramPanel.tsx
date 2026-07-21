/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { ReactFlow, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Icon } from '@primitives'
import { useDiagramData } from './useDiagramData'
import { nodeTypes } from './CustomTableNode'
import '../EerDiagramPanel.css'

export const EerDiagramPanel: React.FC<{ panelId: string }> = () => {
  const { activeEerDiagram, schema, nodes, edges, onNodesChange, onEdgesChange } = useDiagramData()

  if (!activeEerDiagram) {
    return (
      <div className="eer-empty">
        <Icon name="workflow" size={32} className="eer-empty-icon" />
        <div className="eer-empty-text">No EER Diagram Active</div>
        <div className="eer-empty-sub">Right-click a database in the schema explorer and select &quot;View EER Diagram&quot;</div>
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="eer-empty">
        <Icon name="loader" size={24} className="se-spin eer-empty-icon" />
        <div className="eer-empty-text">Loading Schema...</div>
      </div>
    )
  }

  return (
    <div className="eer-container">
      <div className="eer-toolbar">
        <Icon name="workflow" size={14} />
        <span className="eer-toolbar-title">
          EER Diagram: <strong>{activeEerDiagram.database}</strong>
          <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
            ({nodes.length} tables, {edges.length} relations)
          </span>
        </span>
      </div>
      <div className="eer-flow-wrapper">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} fitView className="eer-react-flow" colorMode="dark" proOptions={{ hideAttribution: true }} minZoom={0.1}>
          <Controls />
          <MiniMap nodeColor="var(--color-bg-primary)" maskColor="var(--color-bg-overlay)" style={{ backgroundColor: 'var(--color-bg-panel)' }} />
        </ReactFlow>
      </div>
    </div>
  )
}
