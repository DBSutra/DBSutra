/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { SchemaTable, SchemaColumn } from '@core/types'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { Icon, ContextMenu } from '@primitives'
import { getLanguageForDbType } from '@shared/utils'
import { getDDLMenuItems } from '../ddl'
import { ColumnRow } from './ColumnRow'
import { useConnType } from './useConnType'
import { useDdlAction } from './useDdlAction'

interface Props {
  table: SchemaTable
  connId: string
  dbName: string
  expandedTables: Set<string>
  onToggleTable: (key: string) => void
}

export const TableNode: React.FC<Props> = ({ table, connId, dbName, expandedTables, onToggleTable }) => {
  const { tabs, openTab, setActiveTab, activeTabId } = useAppStore()
  const connType = useConnType(connId)
  const { handleDdlAction } = useDdlAction()

  const key = `tbl-${connId}-${dbName}-${table.name}`
  const isExpanded = expandedTables.has(key)
  const contextId = `table:${connId}:${dbName}:${table.name}`
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isSelected = activeTab?.contextId === contextId

  const handleDoubleClick = () => {
    const existingTab = tabs.find((t) => t.contextId === contextId)
    if (existingTab) {
      useAppStore.setState((s) => ({
        tabs: s.tabs.map((t) => (t.id === existingTab.id ? { ...t, autoRun: true } : t)),
      }))
      setActiveTab(existingTab.id)
      EventBus.emit(Events.FOCUS_PANEL, 'editor')
    } else {
      const language = getLanguageForDbType(connType)
      const content = connType === 'postgres'
        ? `SELECT * FROM "${dbName}"."${table.name}" LIMIT 100;`
        : connType === 'mongodb'
          ? `db.${table.name}.find({}).limit(100)`
          : connType === 'elasticsearch'
            ? `SEARCH ${table.name} {"query":{"match_all":{}},"size":100}`
            : connType === 'redis'
              ? `KEYS ${table.name}:*`
              : `SELECT * FROM \`${dbName}\`.\`${table.name}\` LIMIT 100;`
      openTab({ title: table.name, contextId, connectionId: connId, dbType: connType, language, content, isDirty: false, icon: 'table', autoRun: true })
      EventBus.emit(Events.FOCUS_PANEL, 'editor')
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.se-chevron')) onToggleTable(key)
    else handleDoubleClick()
  }

  const ddlItems = getDDLMenuItems({ table, dbName, dbType: connType })
  const menuItems = ddlItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    onSelect: () => handleDdlAction(item.generator, item.label, connId, connType, 'ddl', `${connId}:${dbName}:${table.name}`),
  }))

  return (
    <div className="se-table-node">
      <ContextMenu items={menuItems}>
        <div className={`se-table-row ${isSelected ? 'selected' : ''}`} onClick={handleClick} title="Click to open · Right-click for DDL">
          <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} className="se-chevron" />
          <Icon name="table" size={13} className="se-node-icon" />
          <span className="se-table-name">{table.name}</span>
          {table.columns?.length > 0 && <span className="se-count">{table.columns.length}</span>}
        </div>
      </ContextMenu>
      {isExpanded && table.columns?.length > 0 && (
        <div className="se-col-list">
          {table.columns.map((col: SchemaColumn) => <ColumnRow key={col.name} column={col} />)}
        </div>
      )}
    </div>
  )
}
