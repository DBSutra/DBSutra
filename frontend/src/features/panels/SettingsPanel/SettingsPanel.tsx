/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useAppStore } from '@core/state/store'
import { SettingsEngine } from '@core/settings/SettingsEngine'
import { Icon } from '@primitives'
import { BasePanel } from '@base/BasePanel'
import { SearchInput } from './shared'
import { SETTING_SECTIONS } from './definitions'
import { GroupedSettingsEditor, ShortcutEditor, ColorOverrideEditor, ThemeManager } from './editors'
import './SettingsPanel.css'

export const SettingsPanel: React.FC<{ panelId: string }> = ({ panelId }) => {
  const [activeSection, setActiveSection] = useState('appearance')
  const [searchQuery, setSearchQuery] = useState('')
  const navLinksRef = useRef<HTMLDivElement>(null)

  // Translate vertical scroll to horizontal in top-tab mode
  useEffect(() => {
    const container = navLinksRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (container.scrollWidth <= container.clientWidth) return
      e.preventDefault()
      container.scrollLeft += e.deltaY
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const appearance = useAppStore((s) => s.appearance)
  const fonts = useAppStore((s) => s.fonts)
  const panelConfig = useAppStore((s) => s.panelConfigState)
  const shortcuts = useAppStore((s) => s.shortcutsConfig)
  const colorOverrides = useAppStore((s) => s.colorOverrides)
  const themesDB = useAppStore((s) => s.themesDB)

  const getTableData = useCallback((table: string): Record<string, string> => {
    switch (table) {
      case 'appearance': return appearance
      case 'fonts': return fonts
      case 'panelConfig': return panelConfig
      case 'shortcuts': return shortcuts
      case 'colorOverrides': return colorOverrides
      default: return {}
    }
  }, [appearance, fonts, panelConfig, shortcuts, colorOverrides])

  const handleChange = useCallback((table: string, key: string, value: string) => {
    const store = useAppStore.getState()

    switch (table) {
      case 'appearance':
        if (key === 'theme_id') {
          SettingsEngine.changeTheme(value)
          store.updateAppearance(key, value)
        } else {
          store.updateAppearance(key, value)
          SettingsEngine.saveAppearance(key, value)
          SettingsEngine.applyAppearance({ ...store.appearance, [key]: value })
        }
        break
      case 'fonts':
        store.updateFont(key, value)
        SettingsEngine.saveFont(key, value)
        SettingsEngine.applyFonts({ ...store.fonts, [key]: value })
        break
      case 'panelConfig':
        store.updatePanelConfig(key, value)
        SettingsEngine.savePanelConfig(key, value)
        SettingsEngine.applyPanelConfig({ ...store.panelConfigState, [key]: value })
        break
      case 'shortcuts':
        store.updateShortcut(key, value)
        SettingsEngine.saveShortcut(key, value)
        break
      case 'colorOverrides':
        store.updateColorOverride(key, value)
        SettingsEngine.saveColorOverride(key, value)
        break
    }
  }, [])

  const handleRemoveColorOverride = useCallback((token: string) => {
    const store = useAppStore.getState()
    const { [token]: _, ...rest } = store.colorOverrides
    store.setColorOverrides(rest)
    SettingsEngine.removeColorOverride(token)
  }, [])

  const handleRemoveShortcut = useCallback((key: string) => {
    const store = useAppStore.getState()
    const { [key]: _, ...rest } = store.shortcutsConfig
    store.setShortcuts(rest)
    SettingsEngine.saveShortcut(key, '')
  }, [])

  // Populate theme options dynamically
  const sections = useMemo(() => SETTING_SECTIONS.map((section) => {
    if (section.id === 'appearance') {
      return {
        ...section,
        settings: section.settings.map((s) =>
          s.key === 'theme_id' ? { ...s, options: themesDB.map(t => ({ value: t.id, label: t.name })) } : s
        ),
      }
    }
    return section
  }), [themesDB])

  const currentSection = sections.find((s) => s.id === activeSection)

  return (
    <BasePanel panelId={panelId} className="settings-panel">
      <div className="sp-body">
        <nav className="sp-nav">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search settings…"
            className="sp-search-wrap"
            iconClassName="sp-search-icon"
            inputClassName="sp-search"
            clearClassName="sp-search-clear"
          />
          <div className="sp-nav-links" ref={navLinksRef}>
            {sections.map((section) => (
              <button
                key={section.id}
                className={`sp-nav-item ${activeSection === section.id ? 'active' : ''}`}
                data-label={section.title}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon name={section.icon} size={15} strokeWidth={1.5} />
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sp-content">
          {currentSection && (
            <>
              <div className="sp-section-header">
                <h2 className="sp-section-title">{currentSection.title}</h2>
                <p className="sp-section-desc">{currentSection.description}</p>
                <div className="sp-section-badge">
                  Table: <code>{currentSection.table}</code>
                </div>
              </div>

              {/* Appearance, Typography, Layout — grouped settings */}
              {currentSection.settings.length > 0 && (
                <GroupedSettingsEditor
                  settings={currentSection.settings}
                  table={currentSection.table}
                  data={getTableData(currentSection.table)}
                  onChange={handleChange}
                />
              )}

              {/* Theme manager — only in Appearance section */}
              {currentSection.id === 'appearance' && <ThemeManager />}

              {/* Keyboard Shortcuts */}
              {currentSection.id === 'shortcuts' && (
                <ShortcutEditor
                  shortcuts={shortcuts}
                  onSave={(k, v) => handleChange('shortcuts', k, v)}
                  onClear={handleRemoveShortcut}
                />
              )}

              {/* Color Overrides */}
              {currentSection.id === 'colorOverrides' && (
                <ColorOverrideEditor
                  data={colorOverrides}
                  onUpdate={(k, v) => handleChange('colorOverrides', k, v)}
                  onRemove={handleRemoveColorOverride}
                />
              )}
            </>
          )}
        </div>
      </div>
    </BasePanel>
  )
}
