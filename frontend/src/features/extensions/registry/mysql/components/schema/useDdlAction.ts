/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { getEditorLanguage } from '@shared/utils'

/**
 * Shared hook for opening DDL content in a new or existing editor tab.
 * Used by both TableNode and DatabaseNode for context menu DDL actions.
 */
export function useDdlAction() {
  const { tabs, openTab, setActiveTab } = useAppStore()

  const handleDdlAction = (
    generator: () => string,
    label: string,
    connId: string,
    connType: string,
    contextIdPrefix: string,
    contextIdSuffix: string
  ) => {
    const content = generator()
    const language = getEditorLanguage(connType)
    const ddlContextId = `${contextIdPrefix}:${contextIdSuffix}:${label}`

    const existingTab = tabs.find((t) => t.contextId === ddlContextId)
    if (existingTab) {
      setActiveTab(existingTab.id)
      EventBus.emit(Events.FOCUS_PANEL, 'editor')
      return
    }

    openTab({
      title: `${label} — ${contextIdSuffix}`,
      contextId: ddlContextId,
      connectionId: connId,
      dbType: connType,
      language,
      content,
      isDirty: false,
      icon: 'code',
      autoRun: false,
    })
    EventBus.emit(Events.FOCUS_PANEL, 'editor')
  }

  return { handleDdlAction }
}
