/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { SchemaDatabase, SchemaTable } from '@core/types'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { Icon, ContextMenu } from '@primitives'
import { getDatabaseDDLMenuItems } from '../ddl'
import { TableNode } from './TableNode'
import { useConnType } from './useConnType'
import { useDdlAction } from './useDdlAction'

interface Props {
  db: SchemaDatabase
  connId: string
  expandedDbs: Set<string>
  expandedTables: Set<string>
  onToggleDb: (key: string) => void
  onToggleTable: (key: string) => void
}

export const DatabaseNode: React.FC<Props> = ({
  db, connId, expandedDbs, expandedTables, onToggleDb, onToggleTable,
}) => {
  const key = `db-${connId}-${db.name}`
  const isExpanded = expandedDbs.has(key)
  const setActiveEerDiagram = useAppStore((s) => s.setActiveEerDiagram)
  const connType = useConnType(connId)
  const { handleDdlAction } = useDdlAction()

  const handleOpenEerDiagram = () => {
    setActiveEerDiagram({ connId, database: db.name })
    EventBus.emit(Events.FOCUS_PANEL, 'eer-diagram')
  }

  const ddlItems = getDatabaseDDLMenuItems(db.name, connType)
  const menuItems = [
    { id: 'open-eer', label: 'View EER Diagram', icon: 'workflow', onSelect: handleOpenEerDiagram },
    ...ddlItems.map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      onSelect: () => handleDdlAction(item.generator, item.label, connId, connType, 'ddl-db', `${connId}:${db.name}`),
    })),
  ]

  return (
    <div className="se-db-node">
      <ContextMenu items={menuItems}>
        <div className="se-db-row" onClick={() => onToggleDb(key)} onDoubleClick={handleOpenEerDiagram}>
          <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} className="se-chevron" />
          <Icon name="hard-drive" size={13} className="se-node-icon" />
          <span className="se-db-name">{db.name}</span>
          <span className="se-count">{db.tables.length}</span>
        </div>
      </ContextMenu>
      {isExpanded && (
        <div className="se-table-list">
          {db.tables.map((table: SchemaTable) => (
            <TableNode key={table.name} table={table} connId={connId} dbName={db.name} expandedTables={expandedTables} onToggleTable={onToggleTable} />
          ))}
        </div>
      )}
    </div>
  )
}
