/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { DatabaseType, ConnectionConfig, ActiveConnection } from '@core/types'

/** Returns the editor language for a given database type. */
export function getLanguageForDbType(dbType: string): 'sql' | 'javascript' {
  return dbType === 'mongodb' ? 'javascript' : 'sql'
}

/** Returns the editor language considering all DB types. */
export function getEditorLanguage(dbType: string): 'sql' | 'javascript' {
  if (dbType === 'mongodb' || dbType === 'redis') return 'javascript'
  return 'sql'
}

/** Finds a saved connection config by ID, falling back to active connection config. */
export function getConnectionById(
  savedConnections: ConnectionConfig[],
  activeConnections: Record<string, ActiveConnection>,
  connId: string
): ConnectionConfig | undefined {
  return savedConnections.find((c) => c.id === connId) ?? activeConnections[connId]?.config
}

/** Returns the display name for a connection. */
export function getConnectionName(
  savedConnections: ConnectionConfig[],
  activeConnections: Record<string, ActiveConnection>,
  connId: string
): string {
  const conn = getConnectionById(savedConnections, activeConnections, connId)
  return conn?.name ?? connId
}

/** Safely extracts the connection type from active connections. */
export function getConnectionType(
  activeConnections: Record<string, ActiveConnection>,
  connId: string
): DatabaseType {
  return (activeConnections[connId]?.config?.type ?? 'mysql') as DatabaseType
}
