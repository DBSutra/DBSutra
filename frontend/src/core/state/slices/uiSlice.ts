/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { StateCreator } from 'zustand'
import type { QueryResult } from '@core/types'

export interface UISlice {
  activePanelId: string | null
  setActivePanelId: (id: string | null) => void
  focusedPanelId: string | null
  setFocusedPanelId: (id: string | null) => void
  bottomPanelVisible: boolean
  setBottomPanelVisible: (v: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  connectionDialogOpen: boolean
  connectionDialogType: string | null
  openConnectionDialog: (type: string) => void
  closeConnectionDialog: () => void
  selectedRow: {
    columns: string[]
    values: unknown[]
    index: number
    connId: string
    database: string
    table: string
    dbType: string
  } | null
  setSelectedRow: (row: UISlice['selectedRow']) => void
  clearSelectedRow: () => void
  activeEerDiagram: { connId: string; database: string } | null
  setActiveEerDiagram: (diagram: UISlice['activeEerDiagram']) => void
  lastQueryResult: QueryResult | null
  setLastQueryResult: (result: QueryResult | null) => void
  queryRunning: boolean
  setQueryRunning: (running: boolean) => void
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  activePanelId: 'editor',
  setActivePanelId: (id) => set({ activePanelId: id }),
  focusedPanelId: 'editor',
  setFocusedPanelId: (id) => set({ focusedPanelId: id }),
  bottomPanelVisible: true,
  setBottomPanelVisible: (v) => set({ bottomPanelVisible: v }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  connectionDialogOpen: false,
  connectionDialogType: null,
  openConnectionDialog: (type) => set({ connectionDialogOpen: true, connectionDialogType: type }),
  closeConnectionDialog: () => set({ connectionDialogOpen: false, connectionDialogType: null }),
  selectedRow: null,
  setSelectedRow: (row) => set({ selectedRow: row }),
  clearSelectedRow: () => set({ selectedRow: null }),
  activeEerDiagram: null,
  setActiveEerDiagram: (diagram) => set({ activeEerDiagram: diagram }),
  lastQueryResult: null,
  setLastQueryResult: (result) => set({ lastQueryResult: result }),
  queryRunning: false,
  setQueryRunning: (running) => set({ queryRunning: running }),
})
