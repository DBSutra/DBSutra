/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { StateCreator } from 'zustand'
import type { ActiveConnection, ConnectionConfig, SchemaDatabase } from '@core/types'

export interface ConnectionSlice {
  savedConnections: ConnectionConfig[]
  activeConnections: Record<string, ActiveConnection>
  addSavedConnection: (config: ConnectionConfig) => void
  removeSavedConnection: (id: string) => void
  setConnectionStatus: (connId: string, conn: ActiveConnection) => void
  removeActiveConnection: (connId: string) => void
  schemaCache: Record<string, SchemaDatabase[]>
  setSchemaCache: (connId: string, schema: SchemaDatabase[]) => void
}

export const createConnectionSlice: StateCreator<ConnectionSlice, [], [], ConnectionSlice> = (set) => ({
  savedConnections: [],
  activeConnections: {},
  addSavedConnection: (config) => set((s) => ({
    savedConnections: [...s.savedConnections.filter((c) => c.id !== config.id), config],
  })),
  removeSavedConnection: (id) => set((s) => ({
    savedConnections: s.savedConnections.filter((c) => c.id !== id),
  })),
  setConnectionStatus: (connId, conn) => set((s) => ({
    activeConnections: { ...s.activeConnections, [connId]: conn },
  })),
  removeActiveConnection: (connId) => set((s) => {
    const { [connId]: _, ...rest } = s.activeConnections
    return { activeConnections: rest }
  }),
  schemaCache: {},
  setSchemaCache: (connId, schema) => set((s) => ({
    schemaCache: { ...s.schemaCache, [connId]: schema },
  })),
})
