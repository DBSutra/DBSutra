/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useCallback } from 'react'
import { useAppStore } from '@core/state/store'
import { SettingsEngine } from '@core/settings/SettingsEngine'
import { logError } from '@shared/utils/errors'
import { useToast } from '@shared/components'
import { Icon, Button } from '@primitives'
import type { ThemeDBRow } from '@core/theme/ThemeEngine'

const ERROR_CONTEXT = { module: 'ThemeManager', operation: '' }

export const ThemeManager: React.FC = () => {
  const themesDB = useAppStore((s) => s.themesDB)
  const toast = useToast()
  const [newThemeName, setNewThemeName] = useState('')
  const [showSaveTheme, setShowSaveTheme] = useState(false)
  const [savingTheme, setSavingTheme] = useState(false)

  const handleSaveAsTheme = useCallback(async () => {
    if (!newThemeName.trim()) return
    setSavingTheme(true)
    try {
      await SettingsEngine.saveAsTheme(newThemeName.trim())
      setNewThemeName('')
      setShowSaveTheme(false)
      toast.success('Theme saved successfully')
    } catch (err) {
      logError(err, { ...ERROR_CONTEXT, operation: 'saveAsTheme', severity: 'medium' })
      toast.error(`Failed to save theme: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSavingTheme(false)
    }
  }, [newThemeName, toast])

  const handleDeleteTheme = useCallback(async (themeId: string) => {
    try {
      await SettingsEngine.deleteCustomTheme(themeId)
      toast.success('Theme deleted')
    } catch (err) {
      logError(err, { ...ERROR_CONTEXT, operation: 'deleteTheme', severity: 'medium' })
      toast.error(`Failed to delete theme: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [toast])

  const handleExportTheme = useCallback((themeId: string) => {
    try {
      const json = SettingsEngine.exportTheme(themeId)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `theme-${themeId}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Theme exported')
    } catch (err) {
      logError(err, { ...ERROR_CONTEXT, operation: 'exportTheme', severity: 'medium' })
      toast.error(`Failed to export theme: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [toast])

  const handleImportTheme = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const id = await SettingsEngine.importTheme(text)
        SettingsEngine.changeTheme(id)
        toast.success('Theme imported and applied')
      } catch (err) {
        logError(err, { ...ERROR_CONTEXT, operation: 'importTheme', severity: 'medium' })
        toast.error(`Failed to import theme: ${err instanceof Error ? err.message : 'Invalid file'}`)
      }
    }
    input.click()
  }, [toast])

  const customThemes = themesDB.filter((t) => !t.isBuiltin)
  const builtinThemes = themesDB.filter((t) => t.isBuiltin)

  return (
    <div className="sp-theme-actions">
      <div className="sp-theme-actions-header">
        {!showSaveTheme ? (
          <Button variant="ghost" size="sm" icon="save" onClick={() => setShowSaveTheme(true)}>Save Current as Theme</Button>
        ) : (
          <div className="sp-save-theme-form">
            <input type="text" className="se-text-input" placeholder="My Custom Theme" value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTheme()} autoFocus />
            <Button variant="primary" size="sm" icon={savingTheme ? 'loader' : 'check'} loading={savingTheme} onClick={handleSaveAsTheme} disabled={!newThemeName.trim()}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowSaveTheme(false); setNewThemeName('') }}>Cancel</Button>
          </div>
        )}
        <Button variant="ghost" size="sm" icon="upload" onClick={handleImportTheme}>Import</Button>
      </div>

      {customThemes.length > 0 && (
        <div className="sp-custom-themes">
          <div className="sp-section-sublabel">Custom Themes</div>
          {customThemes.map((t) => <ThemeRow key={t.id} theme={t} onExport={handleExportTheme} onDelete={handleDeleteTheme} />)}
        </div>
      )}

      <div className="sp-custom-themes" style={{ marginTop: 'var(--space-8)' }}>
        <div className="sp-section-sublabel">Built-in Themes</div>
        {builtinThemes.map((t) => <ThemeRow key={t.id} theme={t} onExport={handleExportTheme} />)}
      </div>
    </div>
  )
}

interface ThemeRowProps {
  theme: ThemeDBRow
  onExport: (id: string) => void
  onDelete?: (id: string) => void
}

const ThemeRow: React.FC<ThemeRowProps> = ({ theme, onExport, onDelete }) => (
  <div className="sp-custom-theme-row">
    <span className="sp-custom-theme-name">{theme.name}</span>
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <button className="se-kv-remove" onClick={() => onExport(theme.id)} title="Export theme"><Icon name="download" size={14} /></button>
      {onDelete && <button className="se-kv-remove" onClick={() => onDelete(theme.id)} title="Delete theme"><Icon name="x" size={14} /></button>}
    </div>
  </div>
)
