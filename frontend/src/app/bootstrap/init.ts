/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { LayoutData } from 'rc-dock'
import { useAppStore } from '@core/state/store'
import { SettingsEngine } from '@core/settings/SettingsEngine'
import { ExtensionHost } from '@extensions/host/ExtensionHost'
import { LoadSettings, LoadConnections, Get } from '@bindings/clientdb/stateservice'
import { ListConnections, Ping, Disconnect, GetSchema } from '@bindings/clientdb/dbservice'
import { activate as mysqlActivate } from '@extensions/registry/mysql/index'
import mysqlManifest from '@extensions/registry/mysql/manifest.json'
import { logError } from '@shared/utils/errors'
import type { SchemaDatabase } from '@core/types'
import { registerCommands } from './commands'
import { registerKeyboardShortcuts } from './shortcuts'
import { buildDefaultLayout } from '../dock/layout'

const CTX = { module: 'bootstrap', operation: '' }
const MODULE = 'bootstrap'

/**
 * Full app bootstrap — loads config, connections, tabs, registers commands,
 * extensions, and keyboard shortcuts.
 *
 * Returns the saved dock layout if available, otherwise null.
 */
export async function bootstrapApp(): Promise<LayoutData | null> {
  const startTime = Date.now()
  console.info(`[${MODULE}] ═══ Bootstrap starting ═══`)

  // 1. Load ALL config from SQLite
  console.info(`[${MODULE}] Step 1/8: Loading all config from SQLite...`)
  const config = await SettingsEngine.loadAll()
  console.info(`[${MODULE}] Config loaded — themes=${config.themes?.length ?? 0} shortcuts=${Object.keys(config.shortcuts).length}`)
  SettingsEngine.applyAll(config)

  // 2. Load saved settings
  console.info(`[${MODULE}] Step 2/8: Loading saved settings...`)
  try {
    const settingsJson = await LoadSettings()
    if (settingsJson) {
      useAppStore.getState().mergeSettings(JSON.parse(settingsJson))
      console.debug(`[${MODULE}] Settings merged`)
    } else {
      console.debug(`[${MODULE}] No saved settings found`)
    }
  } catch (err) {
    logError(err, { ...CTX, operation: 'loadSettings', severity: 'low' })
    console.warn(`[${MODULE}] Settings load failed — using defaults`)
  }

  // 3. Load saved connections + sync active ones
  console.info(`[${MODULE}] Step 3/8: Loading saved connections...`)
  try {
    const connsJson = await LoadConnections()
    if (connsJson && connsJson !== '[]') {
      const parsed = JSON.parse(connsJson)
      console.info(`[${MODULE}] Found ${parsed.length} saved connection(s)`)
      for (const c of parsed) {
        useAppStore.getState().addSavedConnection(c)
      }

      // Sync with backend to see if any are still active (e.g. on window refresh)
      console.debug(`[${MODULE}] Syncing active connections with backend...`)
      try {
        const activeIds = await ListConnections()
        if (activeIds && activeIds.length > 0) {
          console.info(`[${MODULE}] Backend has ${activeIds.length} active connection(s)`)
          const store = useAppStore.getState()
          for (const id of activeIds) {
            const connConfig = store.savedConnections.find((c) => c.id === id)
            if (connConfig) {
              try {
                await Ping(id)
                store.setConnectionStatus(id, {
                  id,
                  name: connConfig.name,
                  type: connConfig.type,
                  status: 'connected',
                  config: connConfig,
                })
                console.debug(`[${MODULE}] Connection ${id} is still active`)
                // Fetch schema in background
                GetSchema(id)
                  .then((schema) => store.setSchemaCache(id, schema as SchemaDatabase[]))
                  .catch((err) => logError(err, { ...CTX, operation: `getSchema:${id}`, severity: 'low' }))
              } catch {
                console.warn(`[${MODULE}] Connection ${id} ping failed — disconnecting`)
                Disconnect(id).catch((err) => logError(err, { ...CTX, operation: `disconnect:${id}`, severity: 'low' }))
              }
            }
          }
        } else {
          console.debug(`[${MODULE}] No active connections on backend`)
        }
      } catch (err) {
        logError(err, { ...CTX, operation: 'syncActiveConnections', severity: 'low' })
        console.warn(`[${MODULE}] Active connection sync failed`)
      }
    } else {
      console.debug(`[${MODULE}] No saved connections found`)
    }
  } catch (err) {
    logError(err, { ...CTX, operation: 'loadConnections', severity: 'medium' })
    console.error(`[${MODULE}] Connection load failed:`, err)
  }

  // 4. Load saved editor tabs
  console.info(`[${MODULE}] Step 4/8: Loading editor tabs...`)
  try {
    const tabsJson = await Get('editor.tabs')
    if (tabsJson) {
      const parsed = JSON.parse(tabsJson)
      if (parsed.tabs && Array.isArray(parsed.tabs)) {
        const seen = new Set<string>()
        const uniqueTabs = []
        for (const t of parsed.tabs) {
          if (!seen.has(t.id)) {
            seen.add(t.id)
            uniqueTabs.push(t)
          }
        }
        useAppStore.setState({
          tabs: uniqueTabs,
          activeTabId: parsed.activeTabId ?? (uniqueTabs.length > 0 ? uniqueTabs[0].id : null),
        })
        console.info(`[${MODULE}] Loaded ${uniqueTabs.length} tab(s)`)
      }
    } else {
      console.debug(`[${MODULE}] No saved tabs found`)
    }
  } catch (err) {
    logError(err, { ...CTX, operation: 'loadTabs', severity: 'low' })
    console.warn(`[${MODULE}] Tab load failed`)
  }

  // 5. Register commands
  console.info(`[${MODULE}] Step 5/8: Registering commands...`)
  registerCommands()

  // 6. Load extensions
  console.info(`[${MODULE}] Step 6/8: Loading extensions...`)
  try {
    await ExtensionHost.loadExtension(mysqlManifest, mysqlActivate)
    console.info(`[${MODULE}] Extensions loaded`)
  } catch (err) {
    logError(err, { ...CTX, operation: 'loadExtensions', severity: 'high' })
    console.error(`[${MODULE}] Extension load failed:`, err)
  }

  // 7. Register keyboard shortcuts
  console.info(`[${MODULE}] Step 7/8: Registering keyboard shortcuts...`)
  registerKeyboardShortcuts()

  // 8. Return saved dock layout if available
  console.info(`[${MODULE}] Step 8/8: Loading dock layout...`)
  if (config.dockLayout) {
    try {
      const layout = JSON.parse(config.dockLayout) as LayoutData
      console.info(`[${MODULE}] Dock layout restored`)
      const duration = Date.now() - startTime
      console.info(`[${MODULE}] ═══ Bootstrap complete (${duration}ms) ═══`)
      return layout
    } catch (err) {
      logError(err, { ...CTX, operation: 'parseLayout', severity: 'low' })
      console.warn(`[${MODULE}] Dock layout parse failed — using default`)
      return null
    }
  }

  // No saved layout — save the default so it persists across restarts
  console.debug(`[${MODULE}] No saved layout — creating default`)
  const defaultLayout = buildDefaultLayout(config.appearance)
  try {
    const json = JSON.stringify(defaultLayout, (key, value) => {
      if (key === 'content' || key === 'title') return undefined
      if (typeof value === 'function') return undefined
      return value
    })
    SettingsEngine.saveDockLayout(json)
  } catch (err) {
    logError(err, { ...CTX, operation: 'saveDefaultLayout', severity: 'low' })
  }

  const duration = Date.now() - startTime
  console.info(`[${MODULE}] ═══ Bootstrap complete (${duration}ms) ═══`)
  return null
}
