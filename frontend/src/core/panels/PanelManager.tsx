/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { TabData } from 'rc-dock'

// ── Panel Definition ─────────────────────────────────────────────────────────

export interface PanelDef {
  /** Unique identifier, e.g. 'connections', 'explorer', 'editor', 'results' */
  id: string
  /** Display title shown in tabs */
  title: string
  /** Lucide icon name */
  icon: string
  /** React component factory — called with panelId prop */
  component: React.FC<{ panelId: string }>
  /** Default dock location hint */
  defaultLocation: 'left' | 'main' | 'bottom'
  /** Whether the tab can be closed */
  closable?: boolean
  /** Default group (for tab grouping) */
  group?: string
}

// ── Panel Manager Singleton ──────────────────────────────────────────────────

class PanelManagerClass {
  private panels = new Map<string, PanelDef>()
  private tabFactory: ((id: string) => TabData | undefined) | null = null

  /**
   * Register a panel definition. Called during extension activation
   * or at app bootstrap for built-in panels.
   */
  register(def: PanelDef): void {
    this.panels.set(def.id, def)
  }

  /** Unregister a panel */
  unregister(id: string): void {
    this.panels.delete(id)
  }

  /** Get a panel definition by ID */
  get(id: string): PanelDef | undefined {
    return this.panels.get(id)
  }

  /** Get all registered panels */
  getAll(): PanelDef[] {
    return Array.from(this.panels.values())
  }

  /** Get panels by location */
  getByLocation(location: PanelDef['defaultLocation']): PanelDef[] {
    return this.getAll().filter(p => p.defaultLocation === location)
  }

  /**
   * Create a TabData object for rc-dock from a panel ID.
   * This is used by rc-dock's `loadTab` callback to restore
   * panels from saved layout JSON.
   */
  createTab(id: string): TabData | undefined {
    const def = this.panels.get(id)
    if (!def) return undefined

    const Component = def.component

    return {
      id: def.id,
      title: def.title,
      content: <Component panelId={def.id} />,
      closable: def.closable ?? true,
      group: def.group ?? 'default',
    }
  }

  /**
   * Set the external tab factory (used by App.tsx to inject
   * the Icon-wrapped title rendering).
   */
  setTabFactory(factory: (id: string) => TabData | undefined): void {
    this.tabFactory = factory
  }

  /**
   * Load a tab — called by rc-dock's loadTab prop.
   * Uses the external factory if set, otherwise falls back to createTab.
   */
  loadTab(data: { id?: string }): TabData | undefined {
    const id = data.id
    if (!id) return undefined
    if (this.tabFactory) {
      return this.tabFactory(id)
    }
    return this.createTab(id)
  }
}

export const PanelManager = new PanelManagerClass()
