/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useAppStore } from '@core/state/store'
import type { ConnectionConfig, SchemaDatabase } from '@core/types'
import { getLanguageForDbType } from '@shared/utils'
import { DEFAULT_QUERY_CONTENT, DEFAULT_MONGO_CONTENT } from '@shared/constants/defaults'
import { Connect, GetSchema } from '@bindings/clientdb/dbservice'
import { SaveConnection } from '@bindings/clientdb/stateservice'

const MODULE = 'ConnectionManager'

export const ConnectionManager = {
  /**
   * Connects to a database, persists the connection, fetches schema,
   * and optionally opens a new query tab.
   */
  async connect(config: ConnectionConfig, autoOpenTab = false): Promise<string> {
    console.info(`[${MODULE}] Connecting — type=${config.type} host=${config.host} port=${config.port} db=${config.database} name=${config.name}`)
    const store = useAppStore.getState()

    // Connect via backend
    let connId: string
    try {
      connId = await Connect(config as unknown as Parameters<typeof Connect>[0])
      console.info(`[${MODULE}] Backend connected — connId=${connId}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[${MODULE}] Connect FAILED:`, {
        type: config.type,
        host: config.host,
        port: config.port,
        database: config.database,
        error: errMsg,
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      })
      throw err
    }

    // Add to saved connections
    store.addSavedConnection(config)

    // Persist to SQLite
    try {
      await SaveConnection(config.id, config.name, config.type, JSON.stringify(config))
      console.debug(`[${MODULE}] Connection saved to SQLite — id=${config.id}`)
    } catch (err) {
      console.warn(`[${MODULE}] Failed to save connection to SQLite:`, err)
    }

    // Update active state
    store.setConnectionStatus(connId, {
      id: connId,
      name: config.name,
      type: config.type,
      status: 'connected',
      connectedAt: Date.now(),
      config,
    })

    // Fetch schema in the background
    try {
      console.debug(`[${MODULE}] Fetching schema for ${connId}...`)
      const schema = await GetSchema(connId)
      store.setSchemaCache(connId, schema as SchemaDatabase[])
      console.debug(`[${MODULE}] Schema loaded for ${connId} — ${(schema as SchemaDatabase[]).length} databases`)
    } catch (err) {
      console.warn(`[${MODULE}] Schema fetch failed for ${connId} (non-fatal):`, err)
    }

    // Open a new query tab if requested
    if (autoOpenTab) {
      const language = getLanguageForDbType(config.type)
      const content = config.type === 'mongodb' ? DEFAULT_MONGO_CONTENT : DEFAULT_QUERY_CONTENT
      store.openTab({
        title: `Query — ${config.name}`,
        connectionId: connId,
        dbType: config.type,
        language,
        content,
        isDirty: false,
        icon: config.type,
      })
      console.debug(`[${MODULE}] Opened query tab for ${connId}`)
    }

    return connId
  },
}
