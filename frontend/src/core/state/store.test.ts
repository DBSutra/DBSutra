/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './store'
import type { ConnectionConfig, EditorTab, Theme, LayoutNode } from '@core/types'
import type { ExtensionManifest } from '@core/types'

// The store's subscribe calls SetState (Wails binding) on tab changes.
// That's already mocked in setup.ts, so we just test the state logic.

function resetStore() {
  const state = useAppStore.getState()
  // Reset tabs
  state.tabs.forEach((t) => state.closeTab(t.id))
  // Reset connections
  Object.keys(state.activeConnections).forEach((id) => state.removeActiveConnection(id))
  state.savedConnections.forEach((c) => state.removeSavedConnection(c.id))
  // Reset UI
  state.setActivePanelId('editor')
  state.setFocusedPanelId('editor')
  state.setBottomPanelVisible(true)
  state.setCommandPaletteOpen(false)
  state.closeConnectionDialog()
  state.clearSelectedRow()
  state.setQueryRunning(false)
  state.setLastQueryResult(null)
  // Reset settings
  state.setSetting('editor.fontSize', 12)
  state.setAppearance({})
  state.setFonts({})
  state.setPanelConfigState({})
  state.setShortcuts({})
  state.setColorOverrides({})
  state.setThemes([])
  // Reset extensions — no dedicated setter, reset via zustand setState
  useAppStore.setState({
    installedExtensions: [],
    activeExtensions: [],
    availableThemes: [],
    themeId: 'dark',
  })
  // Reset layout
  state.setDockLayout(null)
}

describe('AppStore', () => {
  beforeEach(() => {
    resetStore()
  })

  // ────────────────────────────────────────────────────────────
  // Tab Slice
  // ────────────────────────────────────────────────────────────
  describe('TabSlice', () => {
    const makeTab = (overrides: Partial<Omit<EditorTab, 'id'>> = {}): Omit<EditorTab, 'id'> => ({
      title: 'Query',
      language: 'sql',
      content: 'SELECT 1;',
      isDirty: false,
      ...overrides,
    })

    describe('openTab()', () => {
      it('adds a tab and sets it as active', () => {
        const id = useAppStore.getState().openTab(makeTab())

        const { tabs, activeTabId } = useAppStore.getState()
        expect(tabs).toHaveLength(1)
        expect(tabs[0].id).toBe(id)
        expect(activeTabId).toBe(id)
      })

      it('generates unique ids for each tab', () => {
        const state = useAppStore.getState()
        const id1 = state.openTab(makeTab({ title: 'Tab 1' }))
        const id2 = useAppStore.getState().openTab(makeTab({ title: 'Tab 2' }))

        expect(id1).not.toBe(id2)
        expect(useAppStore.getState().tabs).toHaveLength(2)
      })

      it('copies all tab data into the store', () => {
        const data = makeTab({
          title: 'My Query',
          connectionId: 'conn-1',
          dbType: 'mysql',
          language: 'sql',
          content: 'SELECT * FROM users',
          isDirty: true,
        })

        const id = useAppStore.getState().openTab(data)
        const tab = useAppStore.getState().tabs.find((t) => t.id === id)!

        expect(tab.title).toBe('My Query')
        expect(tab.connectionId).toBe('conn-1')
        expect(tab.dbType).toBe('mysql')
        expect(tab.content).toBe('SELECT * FROM users')
        expect(tab.isDirty).toBe(true)
      })
    })

    describe('closeTab()', () => {
      it('removes the tab', () => {
        const state = useAppStore.getState()
        const id = state.openTab(makeTab())

        useAppStore.getState().closeTab(id)

        expect(useAppStore.getState().tabs).toHaveLength(0)
      })

      it('sets active tab to the last remaining tab', () => {
        const state = useAppStore.getState()
        const id1 = state.openTab(makeTab({ title: 'Tab 1' }))
        const id2 = useAppStore.getState().openTab(makeTab({ title: 'Tab 2' }))

        useAppStore.getState().closeTab(id2)

        expect(useAppStore.getState().activeTabId).toBe(id1)
      })

      it('sets activeTabId to null when no tabs remain', () => {
        const state = useAppStore.getState()
        const id = state.openTab(makeTab())

        useAppStore.getState().closeTab(id)

        expect(useAppStore.getState().activeTabId).toBeNull()
      })

      it('switches active to previous tab when closing the active tab', () => {
        const state = useAppStore.getState()
        state.openTab(makeTab({ title: 'Tab 1' }))
        const id2 = useAppStore.getState().openTab(makeTab({ title: 'Tab 2' }))
        const id3 = useAppStore.getState().openTab(makeTab({ title: 'Tab 3' }))
        // active is id3
        useAppStore.getState().closeTab(id3)
        expect(useAppStore.getState().activeTabId).toBe(id2)
      })
    })

    describe('setActiveTab()', () => {
      it('changes the active tab id', () => {
        const state = useAppStore.getState()
        const id1 = state.openTab(makeTab())
        useAppStore.getState().openTab(makeTab())

        useAppStore.getState().setActiveTab(id1)

        expect(useAppStore.getState().activeTabId).toBe(id1)
      })
    })

    describe('updateTabContent()', () => {
      it('updates content and marks tab dirty', () => {
        const state = useAppStore.getState()
        const id = state.openTab(makeTab({ content: 'original', isDirty: false }))

        useAppStore.getState().updateTabContent(id, 'new content')

        const tab = useAppStore.getState().tabs.find((t) => t.id === id)!
        expect(tab.content).toBe('new content')
        expect(tab.isDirty).toBe(true)
      })
    })

    describe('markTabDirty()', () => {
      it('sets the dirty flag', () => {
        const state = useAppStore.getState()
        const id = state.openTab(makeTab({ isDirty: true }))

        useAppStore.getState().markTabDirty(id, false)

        expect(useAppStore.getState().tabs.find((t) => t.id === id)!.isDirty).toBe(false)
      })
    })

    describe('renameTab()', () => {
      it('changes the tab title', () => {
        const state = useAppStore.getState()
        const id = state.openTab(makeTab({ title: 'Old' }))

        useAppStore.getState().renameTab(id, 'New Title')

        expect(useAppStore.getState().tabs.find((t) => t.id === id)!.title).toBe('New Title')
      })
    })

    describe('updateTabFilters()', () => {
      it('merges filter fields into the tab', () => {
        const state = useAppStore.getState()
        const id = state.openTab(makeTab())

        useAppStore.getState().updateTabFilters(id, {
          filterCol: 'name',
          filterOp: '=',
          filterVal: 'Alice',
          sortCol: 'id',
          sortDir: 'ASC',
        })

        const tab = useAppStore.getState().tabs.find((t) => t.id === id)!
        expect(tab.filterCol).toBe('name')
        expect(tab.sortCol).toBe('id')
        expect(tab.sortDir).toBe('ASC')
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // Connection Slice
  // ────────────────────────────────────────────────────────────
  describe('ConnectionSlice', () => {
    const makeConnConfig = (id = 'cfg-1'): ConnectionConfig => ({
      id,
      name: `DB ${id}`,
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'testdb',
      username: 'root',
      password: '',
      ssl: false,
    })

    describe('addSavedConnection()', () => {
      it('adds a connection to savedConnections', () => {
        const config = makeConnConfig()
        useAppStore.getState().addSavedConnection(config)

        expect(useAppStore.getState().savedConnections).toHaveLength(1)
        expect(useAppStore.getState().savedConnections[0].id).toBe('cfg-1')
      })

      it('deduplicates by id (replaces existing)', () => {
        const config = makeConnConfig('same-id')
        useAppStore.getState().addSavedConnection({ ...config, name: 'Original' })
        useAppStore.getState().addSavedConnection({ ...config, name: 'Updated' })

        expect(useAppStore.getState().savedConnections).toHaveLength(1)
        expect(useAppStore.getState().savedConnections[0].name).toBe('Updated')
      })
    })

    describe('removeSavedConnection()', () => {
      it('removes a saved connection by id', () => {
        const config = makeConnConfig()
        useAppStore.getState().addSavedConnection(config)
        useAppStore.getState().removeSavedConnection('cfg-1')

        expect(useAppStore.getState().savedConnections).toHaveLength(0)
      })
    })

    describe('setConnectionStatus()', () => {
      it('adds an active connection', () => {
        const config = makeConnConfig()
        useAppStore.getState().setConnectionStatus('conn-1', {
          id: 'conn-1',
          name: 'Test',
          type: 'mysql',
          status: 'connected',
          config,
        })

        expect(useAppStore.getState().activeConnections['conn-1']).toBeDefined()
        expect(useAppStore.getState().activeConnections['conn-1'].status).toBe('connected')
      })

      it('updates an existing active connection', () => {
        const config = makeConnConfig()
        useAppStore.getState().setConnectionStatus('conn-1', {
          id: 'conn-1',
          name: 'Test',
          type: 'mysql',
          status: 'connected',
          config,
        })

        useAppStore.getState().setConnectionStatus('conn-1', {
          id: 'conn-1',
          name: 'Test',
          type: 'mysql',
          status: 'error',
          error: 'timeout',
          config,
        })

        expect(useAppStore.getState().activeConnections['conn-1'].status).toBe('error')
      })
    })

    describe('removeActiveConnection()', () => {
      it('removes an active connection', () => {
        const config = makeConnConfig()
        useAppStore.getState().setConnectionStatus('conn-1', {
          id: 'conn-1',
          name: 'Test',
          type: 'mysql',
          status: 'connected',
          config,
        })

        useAppStore.getState().removeActiveConnection('conn-1')

        expect(useAppStore.getState().activeConnections['conn-1']).toBeUndefined()
      })
    })

    describe('setSchemaCache()', () => {
      it('stores schema for a connection', () => {
        const schema = [{ name: 'mydb', tables: [] }]
        useAppStore.getState().setSchemaCache('conn-1', schema)

        expect(useAppStore.getState().schemaCache['conn-1']).toEqual(schema)
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // Settings Slice
  // ────────────────────────────────────────────────────────────
  describe('SettingsSlice', () => {
    describe('setSetting() / getSetting()', () => {
      it('sets and retrieves a setting', () => {
        useAppStore.getState().setSetting('editor.fontSize', 16)

        expect(useAppStore.getState().getSetting('editor.fontSize')).toBe(16)
      })

      it('returns the default for an unset key', () => {
        expect(useAppStore.getState().getSetting('editor.tabSize')).toBe(2)
      })
    })

    describe('mergeSettings()', () => {
      it('merges multiple settings at once', () => {
        useAppStore.getState().mergeSettings({
          'editor.fontSize': 20,
          'theme': 'light',
        })

        expect(useAppStore.getState().getSetting('editor.fontSize')).toBe(20)
        expect(useAppStore.getState().getSetting('theme')).toBe('light')
      })
    })

    describe('appearance', () => {
      it('sets and updates appearance values', () => {
        useAppStore.getState().setAppearance({ theme_id: 'dark', panel_radius: '8' })
        useAppStore.getState().updateAppearance('panel_gap', '2')

        const { appearance } = useAppStore.getState()
        expect(appearance.theme_id).toBe('dark')
        expect(appearance.panel_gap).toBe('2')
      })
    })

    describe('fonts', () => {
      it('sets and updates font values', () => {
        useAppStore.getState().setFonts({ ui_family: 'Arial' })
        useAppStore.getState().updateFont('editor_family', 'Fira Code')

        expect(useAppStore.getState().fonts.ui_family).toBe('Arial')
        expect(useAppStore.getState().fonts.editor_family).toBe('Fira Code')
      })
    })

    describe('shortcutsConfig', () => {
      it('sets and updates shortcuts', () => {
        useAppStore.getState().setShortcuts({ 'editor.save': 'Ctrl+S' })
        useAppStore.getState().updateShortcut('editor.copy', 'Ctrl+C')

        expect(useAppStore.getState().shortcutsConfig['editor.save']).toBe('Ctrl+S')
        expect(useAppStore.getState().shortcutsConfig['editor.copy']).toBe('Ctrl+C')
      })
    })

    describe('colorOverrides', () => {
      it('sets and updates color overrides', () => {
        useAppStore.getState().setColorOverrides({ '--color-accent': '#ff0000' })
        useAppStore.getState().updateColorOverride('--color-error', '#f00')

        expect(useAppStore.getState().colorOverrides['--color-accent']).toBe('#ff0000')
        expect(useAppStore.getState().colorOverrides['--color-error']).toBe('#f00')
      })
    })

    describe('themesDB', () => {
      it('stores theme database rows', () => {
        const themes = [
          { id: 'custom', name: 'Custom', colors: {}, isBuiltin: false },
        ]
        useAppStore.getState().setThemes(themes)

        expect(useAppStore.getState().themesDB).toEqual(themes)
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // UI Slice
  // ────────────────────────────────────────────────────────────
  describe('UISlice', () => {
    it('defaults activePanelId to "editor"', () => {
      expect(useAppStore.getState().activePanelId).toBe('editor')
    })

    it('setActivePanelId changes active panel', () => {
      useAppStore.getState().setActivePanelId('explorer')
      expect(useAppStore.getState().activePanelId).toBe('explorer')
    })

    it('setFocusedPanelId changes focused panel', () => {
      useAppStore.getState().setFocusedPanelId('results')
      expect(useAppStore.getState().focusedPanelId).toBe('results')
    })

    it('toggles bottom panel visibility', () => {
      useAppStore.getState().setBottomPanelVisible(false)
      expect(useAppStore.getState().bottomPanelVisible).toBe(false)
    })

    it('toggles command palette', () => {
      useAppStore.getState().setCommandPaletteOpen(true)
      expect(useAppStore.getState().commandPaletteOpen).toBe(true)
    })

    describe('connection dialog', () => {
      it('opens with type', () => {
        useAppStore.getState().openConnectionDialog('postgres')

        expect(useAppStore.getState().connectionDialogOpen).toBe(true)
        expect(useAppStore.getState().connectionDialogType).toBe('postgres')
      })

      it('closes', () => {
        useAppStore.getState().openConnectionDialog('mysql')
        useAppStore.getState().closeConnectionDialog()

        expect(useAppStore.getState().connectionDialogOpen).toBe(false)
        expect(useAppStore.getState().connectionDialogType).toBeNull()
      })
    })

    describe('selectedRow', () => {
      it('sets and clears selected row', () => {
        const row = {
          columns: ['id', 'name'],
          values: [1, 'Alice'],
          index: 0,
          connId: 'c1',
          database: 'testdb',
          table: 'users',
          dbType: 'mysql',
        }

        useAppStore.getState().setSelectedRow(row)
        expect(useAppStore.getState().selectedRow).toEqual(row)

        useAppStore.getState().clearSelectedRow()
        expect(useAppStore.getState().selectedRow).toBeNull()
      })
    })

    describe('queryRunning', () => {
      it('tracks query running state', () => {
        useAppStore.getState().setQueryRunning(true)
        expect(useAppStore.getState().queryRunning).toBe(true)

        useAppStore.getState().setQueryRunning(false)
        expect(useAppStore.getState().queryRunning).toBe(false)
      })
    })

    describe('lastQueryResult', () => {
      it('stores query results', () => {
        const result = { columns: ['id'], rows: [[1]], rowsAffected: 0 }
        useAppStore.getState().setLastQueryResult(result)
        expect(useAppStore.getState().lastQueryResult).toEqual(result)

        useAppStore.getState().setLastQueryResult(null)
        expect(useAppStore.getState().lastQueryResult).toBeNull()
      })
    })

    describe('activeEerDiagram', () => {
      it('sets and clears the EER diagram reference', () => {
        useAppStore.getState().setActiveEerDiagram({ connId: 'c1', database: 'mydb' })
        expect(useAppStore.getState().activeEerDiagram).toEqual({ connId: 'c1', database: 'mydb' })

        useAppStore.getState().setActiveEerDiagram(null)
        expect(useAppStore.getState().activeEerDiagram).toBeNull()
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // Layout Slice
  // ────────────────────────────────────────────────────────────
  describe('LayoutSlice', () => {
    it('initializes with DEFAULT_LAYOUT', () => {
      const { layout } = useAppStore.getState()
      expect(layout.type).toBe('row')
      expect((layout as Extract<LayoutNode, { type: 'row' }>).children).toHaveLength(2)
    })

    it('setLayout replaces the layout', () => {
      const newLayout = { type: 'column' as const, children: [], sizes: [] }
      useAppStore.getState().setLayout(newLayout as any)
      expect(useAppStore.getState().layout.type).toBe('column')
    })

    it('setDockLayout stores the JSON', () => {
      useAppStore.getState().setDockLayout('{"panels":[]}')
      expect(useAppStore.getState().dockLayoutJson).toBe('{"panels":[]}')
    })

    it('setDockLayout(null) clears the dock layout', () => {
      useAppStore.getState().setDockLayout('{"panels":[]}')
      useAppStore.getState().setDockLayout(null)
      expect(useAppStore.getState().dockLayoutJson).toBeNull()
    })

    it('incrementLayoutKey bumps the key', () => {
      const before = useAppStore.getState().layoutKey
      useAppStore.getState().incrementLayoutKey()
      expect(useAppStore.getState().layoutKey).toBe(before + 1)
    })
  })

  // ────────────────────────────────────────────────────────────
  // Extension Slice
  // ────────────────────────────────────────────────────────────
  describe('ExtensionSlice', () => {
    const makeManifest = (id = 'ext-1'): ExtensionManifest => ({
      id,
      name: `Extension ${id}`,
      version: '1.0.0',
      activationEvents: [],
      contributes: {},
    })

    describe('registerExtension()', () => {
      it('adds an extension manifest', () => {
        useAppStore.getState().registerExtension(makeManifest('ext-a'))

        expect(useAppStore.getState().installedExtensions).toHaveLength(1)
        expect(useAppStore.getState().installedExtensions[0].id).toBe('ext-a')
      })

      it('deduplicates by id', () => {
        useAppStore.getState().registerExtension({ ...makeManifest('same'), name: 'V1' })
        useAppStore.getState().registerExtension({ ...makeManifest('same'), name: 'V2' })

        expect(useAppStore.getState().installedExtensions).toHaveLength(1)
        expect(useAppStore.getState().installedExtensions[0].name).toBe('V2')
      })
    })

    describe('activateExtension()', () => {
      it('adds the extension id to activeExtensions', () => {
        useAppStore.getState().activateExtension('ext-1')
        expect(useAppStore.getState().activeExtensions).toContain('ext-1')
      })

      it('does not duplicate if already active', () => {
        useAppStore.getState().activateExtension('ext-1')
        useAppStore.getState().activateExtension('ext-1')
        expect(useAppStore.getState().activeExtensions.filter((id) => id === 'ext-1')).toHaveLength(1)
      })
    })

    describe('themeId / setThemeId()', () => {
      it('defaults to "dark"', () => {
        expect(useAppStore.getState().themeId).toBe('dark')
      })

      it('updates the theme id', () => {
        useAppStore.getState().setThemeId('light')
        expect(useAppStore.getState().themeId).toBe('light')
      })
    })

    describe('registerTheme()', () => {
      it('adds a theme to availableThemes', () => {
        const theme: Theme = { id: 'custom', name: 'Custom', colors: {}, components: {} }
        useAppStore.getState().registerTheme(theme)

        expect(useAppStore.getState().availableThemes).toHaveLength(1)
        expect(useAppStore.getState().availableThemes[0].id).toBe('custom')
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // Preferences Slice
  // ────────────────────────────────────────────────────────────
  describe('PreferencesSlice', () => {
    it('initializes with DEFAULT_PREFERENCES', () => {
      const { preferences } = useAppStore.getState()
      expect(preferences.general.theme).toBe('dark')
      expect(preferences.editor.tabSize).toBe(2)
      expect(preferences.query.maxRows).toBe(1000)
    })

    describe('setPreference()', () => {
      it('sets a single preference value', () => {
        useAppStore.getState().setPreference('general', 'theme', 'light')
        expect(useAppStore.getState().preferences.general.theme).toBe('light')
      })

      it('only changes the targeted key', () => {
        const original = useAppStore.getState().preferences.general.language
        useAppStore.getState().setPreference('general', 'theme', 'auto')
        expect(useAppStore.getState().preferences.general.language).toBe(original)
      })
    })

    describe('resetPreferences()', () => {
      it('resets all preferences to defaults', () => {
        useAppStore.getState().setPreference('editor', 'fontSize', 99)
        useAppStore.getState().resetPreferences()

        expect(useAppStore.getState().preferences.editor.fontSize).toBe(13)
      })
    })

    describe('resetCategory()', () => {
      it('resets only the specified category', () => {
        useAppStore.getState().setPreference('editor', 'fontSize', 99)
        useAppStore.getState().setPreference('query', 'maxRows', 500)

        useAppStore.getState().resetCategory('editor')

        expect(useAppStore.getState().preferences.editor.fontSize).toBe(13) // reset
        expect(useAppStore.getState().preferences.query.maxRows).toBe(500) // unchanged
      })
    })
  })
})
