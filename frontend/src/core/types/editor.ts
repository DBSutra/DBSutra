/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// ── Editor / Tab Types ───────────────────────────────────────────────
export interface EditorTab {
  id: string
  title: string
  contextId?: string
  connectionId?: string
  dbType?: string
  language: string
  content: string
  isDirty: boolean
  icon?: string
  autoRun?: boolean
  filterCol?: string
  filterOp?: string
  filterVal?: string
  sortCol?: string
  sortDir?: 'ASC' | 'DESC'
}
