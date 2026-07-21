/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { useAppStore } from '@core/state/store'
import { Icon } from '@primitives'

/**
 * VS Code-style editor area with tabs.
 */
export const EditorArea: React.FC = () => {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const closeTab = useAppStore((s) => s.closeTab)

  if (tabs.length === 0) {
    return (
      <div className="editor-area">
        <div className="editor-welcome">
          <Icon name="database" size={48} style={{ opacity: 0.3 }} />
          <h2>DBSutra</h2>
          <p>Open a connection and run queries to get started</p>
          <div className="editor-welcome-shortcuts">
            <div className="shortcut-item">
              <kbd>Ctrl+N</kbd> New Query
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl+Shift+P</kbd> Command Palette
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`editor-tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon ?? 'file-text'} size={14} />
            <span className="editor-tab-title">{tab.title}</span>
            {tab.isDirty && <span className="editor-tab-dot">●</span>}
            <button
              className="editor-tab-close"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="editor-content">
        {/* Editor content will be rendered here based on active tab */}
        <div className="editor-placeholder">
          <p>Tab content: {tabs.find((t) => t.id === activeTabId)?.title ?? 'None'}</p>
        </div>
      </div>
    </div>
  )
}
