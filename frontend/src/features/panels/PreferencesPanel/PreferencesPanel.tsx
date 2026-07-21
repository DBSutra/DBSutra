/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState } from 'react'
import { useAppStore } from '@core/state/store'
import { PREFERENCE_CATEGORIES } from '@config/preferences'
import { Icon } from '@primitives'
import { BasePanel } from '@base/BasePanel'
import './PreferencesPanel.css'

export const PreferencesPanel: React.FC<{ panelId: string }> = ({ panelId }) => {
  const preferences = useAppStore((s) => s.preferences)
  const setPreference = useAppStore((s) => s.setPreference)
  const resetCategory = useAppStore((s) => s.resetCategory)
  const [activeCategory, setActiveCategory] = useState<string>('general')

  const renderGeneralSettings = () => (
    <div className="pref-section">
      <h3 className="pref-section-title">General</h3>
      <div className="pref-group">
        <label className="pref-label">Theme</label>
        <select
          className="pref-select"
          value={preferences.general.theme}
          onChange={(e) => setPreference('general', 'theme', e.target.value)}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="auto">Auto</option>
        </select>
      </div>
      <div className="pref-group">
        <label className="pref-label">Font Size</label>
        <input
          type="number"
          className="pref-input"
          value={preferences.general.fontSize}
          onChange={(e) => setPreference('general', 'fontSize', parseInt(e.target.value))}
          min={8}
          max={24}
        />
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.general.showLineNumbers}
            onChange={(e) => setPreference('general', 'showLineNumbers', e.target.checked)}
          />
          Show Line Numbers
        </label>
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.general.wordWrap}
            onChange={(e) => setPreference('general', 'wordWrap', e.target.checked)}
          />
          Word Wrap
        </label>
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.general.autoSave}
            onChange={(e) => setPreference('general', 'autoSave', e.target.checked)}
          />
          Auto Save
        </label>
      </div>
    </div>
  )

  const renderEditorSettings = () => (
    <div className="pref-section">
      <h3 className="pref-section-title">Editor</h3>
      <div className="pref-group">
        <label className="pref-label">Tab Size</label>
        <select
          className="pref-select"
          value={preferences.editor.tabSize}
          onChange={(e) => setPreference('editor', 'tabSize', parseInt(e.target.value))}
        >
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
          <option value={8}>8 spaces</option>
        </select>
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.editor.codeFolding}
            onChange={(e) => setPreference('editor', 'codeFolding', e.target.checked)}
          />
          Code Folding
        </label>
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.editor.autoCloseBrackets}
            onChange={(e) => setPreference('editor', 'autoCloseBrackets', e.target.checked)}
          />
          Auto Close Brackets
        </label>
      </div>
    </div>
  )

  const renderQuerySettings = () => (
    <div className="pref-section">
      <h3 className="pref-section-title">Query</h3>
      <div className="pref-group">
        <label className="pref-label">Max Rows</label>
        <input
          type="number"
          className="pref-input"
          value={preferences.query.maxRows}
          onChange={(e) => setPreference('query', 'maxRows', parseInt(e.target.value))}
          min={100}
          max={100000}
        />
      </div>
      <div className="pref-group">
        <label className="pref-label">Default Limit</label>
        <input
          type="number"
          className="pref-input"
          value={preferences.query.defaultLimit}
          onChange={(e) => setPreference('query', 'defaultLimit', parseInt(e.target.value))}
          min={1}
          max={10000}
        />
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.query.showExecutionTime}
            onChange={(e) => setPreference('query', 'showExecutionTime', e.target.checked)}
          />
          Show Execution Time
        </label>
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.query.confirmOnExecute}
            onChange={(e) => setPreference('query', 'confirmOnExecute', e.target.checked)}
          />
          Confirm Before Execute
        </label>
      </div>
    </div>
  )

  const renderConnectionSettings = () => (
    <div className="pref-section">
      <h3 className="pref-section-title">Connection</h3>
      <div className="pref-group">
        <label className="pref-label">Connection Timeout (s)</label>
        <input
          type="number"
          className="pref-input"
          value={preferences.connection.connectionTimeout}
          onChange={(e) => setPreference('connection', 'connectionTimeout', parseInt(e.target.value))}
          min={5}
          max={120}
        />
      </div>
      <div className="pref-group">
        <label className="pref-label">Query Timeout (s)</label>
        <input
          type="number"
          className="pref-input"
          value={preferences.connection.queryTimeout}
          onChange={(e) => setPreference('connection', 'queryTimeout', parseInt(e.target.value))}
          min={5}
          max={300}
        />
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.connection.autoConnect}
            onChange={(e) => setPreference('connection', 'autoConnect', e.target.checked)}
          />
          Auto Connect on Startup
        </label>
      </div>
    </div>
  )

  const renderUISettings = () => (
    <div className="pref-section">
      <h3 className="pref-section-title">Interface</h3>
      <div className="pref-group">
        <label className="pref-label">Sidebar Width</label>
        <input
          type="number"
          className="pref-input"
          value={preferences.ui.sidebarWidth}
          onChange={(e) => setPreference('ui', 'sidebarWidth', parseInt(e.target.value))}
          min={150}
          max={500}
        />
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.ui.showStatusBar}
            onChange={(e) => setPreference('ui', 'showStatusBar', e.target.checked)}
          />
          Show Status Bar
        </label>
      </div>
      <div className="pref-group">
        <label className="pref-label">
          <input
            type="checkbox"
            checked={preferences.ui.showActivityBar}
            onChange={(e) => setPreference('ui', 'showActivityBar', e.target.checked)}
          />
          Show Activity Bar
        </label>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeCategory) {
      case 'general': return renderGeneralSettings()
      case 'editor': return renderEditorSettings()
      case 'query': return renderQuerySettings()
      case 'connection': return renderConnectionSettings()
      case 'ui': return renderUISettings()
      default: return renderGeneralSettings()
    }
  }

  return (
    <BasePanel panelId={panelId} className="preferences-panel">
      <div className="pref-layout">
        <div className="pref-sidebar">
          {PREFERENCE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`pref-nav-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon name={cat.icon} size={14} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
        <div className="pref-content">
          {renderContent()}
          <div className="pref-actions">
            <button className="pref-btn pref-btn-reset" onClick={() => resetCategory(activeCategory as any)}>
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </BasePanel>
  )
}
