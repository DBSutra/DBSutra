/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { StateCreator } from 'zustand'
import type { EditorTab } from '@core/types'

export interface TabSlice {
  tabs: EditorTab[]
  activeTabId: string | null
  openTab: (tab: Omit<EditorTab, 'id'>) => string
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  markTabDirty: (id: string, isDirty: boolean) => void
  renameTab: (id: string, newTitle: string) => void
  updateTabFilters: (id: string, filters: Partial<EditorTab>) => void
}

export const createTabSlice: StateCreator<TabSlice, [], [], TabSlice> = (set) => ({
  tabs: [],
  activeTabId: null,
  openTab: (tabData) => {
    const id = `tab-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    const tab: EditorTab = { ...tabData, id }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: id }))
    return id
  },
  closeTab: (id) => set((s) => {
    const tabs = s.tabs.filter((t) => t.id !== id)
    const activeTabId = s.activeTabId === id
      ? (tabs[tabs.length - 1]?.id ?? null)
      : s.activeTabId
    return { tabs, activeTabId }
  }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateTabContent: (id, content) => set((s) => ({
    tabs: s.tabs.map((t) => (t.id === id ? { ...t, content, isDirty: true } : t)),
  })),
  markTabDirty: (id, isDirty) => set((s) => ({
    tabs: s.tabs.map((t) => (t.id === id ? { ...t, isDirty } : t)),
  })),
  renameTab: (id, newTitle) => set((s) => ({
    tabs: s.tabs.map((t) => (t.id === id ? { ...t, title: newTitle } : t)),
  })),
  updateTabFilters: (id, filters) => set((s) => ({
    tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...filters } : t)),
  })),
})
