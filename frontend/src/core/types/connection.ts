/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// ── Connection Types ─────────────────────────────────────────────────
export type DatabaseType = 'mysql' | 'postgres' | 'mongodb' | 'sqlite' | 'redis' | 'elasticsearch'

export interface SSHConfig {
  host: string
  port: number
  user: string
  password?: string
  keyFile?: string
  keyPass?: string
}

export interface ConnectionConfig {
  id: string
  name: string
  type: DatabaseType
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  connectionString?: string
  ssh?: SSHConfig
  options?: Record<string, string>
}

export interface ActiveConnection {
  id: string
  name: string
  type: string
  status: 'connecting' | 'connected' | 'error' | 'disconnected'
  connectedAt?: number
  error?: string
  config: ConnectionConfig
}
