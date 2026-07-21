/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { StateCreator } from 'zustand'
import type { LayoutNode } from '@core/types'
import { DEFAULT_LAYOUT } from '@config/defaults'

export interface LayoutSlice {
  layout: LayoutNode
  setLayout: (layout: LayoutNode) => void
  updateLayoutSizes: (path: number[], sizes: number[]) => void
  dockLayoutJson: string | null
  setDockLayout: (json: string | null) => void
  layoutKey: number
  incrementLayoutKey: () => void
}

export const createLayoutSlice: StateCreator<LayoutSlice, [], [], LayoutSlice> = (set, get) => ({
  layout: DEFAULT_LAYOUT,
  setLayout: (layout) => set({ layout }),
  updateLayoutSizes: (path, sizes) => {
    const update = (node: LayoutNode, pathIdx: number): LayoutNode => {
      if (pathIdx >= path.length) return { ...node, sizes } as LayoutNode
      if (node.type === 'panel') return node
      const children = (node as { children: LayoutNode[] }).children.map((c, i) =>
        i === path[pathIdx] ? update(c, pathIdx + 1) : c
      )
      return { ...node, children } as LayoutNode
    }
    set({ layout: update(get().layout, 0) })
  },
  dockLayoutJson: null,
  setDockLayout: (json) => set({ dockLayoutJson: json }),
  layoutKey: 0,
  incrementLayoutKey: () => set((s) => ({ layoutKey: s.layoutKey + 1 })),
})
