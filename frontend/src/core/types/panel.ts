/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// ── Panel Types ──────────────────────────────────────────────────────
export interface PanelDescriptor {
  id: string
  title: string
  icon?: string
  component: React.FC<PanelProps>
  location?: 'sidebar' | 'editor' | 'bottom' | 'activity'
}

export interface PanelProps {
  panelId: string
  [key: string]: unknown
}

// ── Database Driver Types ────────────────────────────────────────────
export interface DatabaseDriver {
  type: string
  displayName: string
  defaultPort: number
  icon: string
  ConnectionFormComponent: React.FC<ConnectionFormProps>
}

export interface ConnectionFormProps {
  onConnect: (config: ConnectionConfig) => void
  initialConfig?: Partial<ConnectionConfig>
}

// Import ConnectionConfig for the form props
import type { ConnectionConfig } from './connection'
