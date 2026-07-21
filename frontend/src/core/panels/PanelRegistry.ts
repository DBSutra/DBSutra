/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { PanelDescriptor, PanelInstance, PanelLocation, PanelComponentProps } from './types'

/**
 * Panel Registry — manages all panel definitions and instances.
 * Extensions register panels here; the layout system reads from here.
 */
class PanelRegistryImpl {
  private descriptors = new Map<string, PanelDescriptor>()
  private instances = new Map<string, PanelInstance>()

  /**
   * Register a panel descriptor.
   */
  register(descriptor: PanelDescriptor): void {
    if (this.descriptors.has(descriptor.id)) {
      console.warn(`[PanelRegistry] Panel "${descriptor.id}" already registered, overwriting`)
    }
    console.debug(`[PanelRegistry] Registered panel: ${descriptor.id} (${descriptor.location})`)
    this.descriptors.set(descriptor.id, descriptor)
  }

  /**
   * Unregister a panel.
   */
  unregister(id: string): void {
    this.descriptors.delete(id)
    this.instances.delete(id)
    console.debug(`[PanelRegistry] Unregistered panel: ${id}`)
  }

  /**
   * Get a panel descriptor by ID.
   */
  get(id: string): PanelDescriptor | undefined {
    return this.descriptors.get(id)
  }

  /**
   * Get all registered panels.
   */
  getAll(): PanelDescriptor[] {
    return Array.from(this.descriptors.values())
  }

  /**
   * Get panels by location.
   */
  getByLocation(location: PanelLocation): PanelDescriptor[] {
    return this.getAll()
      .filter((p) => p.location === location)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  }

  /**
   * Get panels by group.
   */
  getByGroup(group: string): PanelDescriptor[] {
    return this.getAll().filter((p) => p.group === group)
  }

  /**
   * Get all registered panel IDs.
   */
  getIds(): string[] {
    return Array.from(this.descriptors.keys())
  }

  /**
   * Check if a panel is registered.
   */
  has(id: string): boolean {
    return this.descriptors.has(id)
  }

  /**
   * Open a panel (create an instance).
   */
  open(id: string): PanelInstance | null {
    const descriptor = this.descriptors.get(id)
    if (!descriptor) {
      console.warn(`[PanelRegistry] Panel "${id}" not found`)
      return null
    }

    // Singleton check
    if (descriptor.singleton) {
      const existing = Array.from(this.instances.values()).find(
        (i) => i.descriptorId === id && i.visible
      )
      if (existing) {
        existing.active = true
        return existing
      }
    }

    const instance: PanelInstance = {
      id: `${id}-${Date.now()}`,
      descriptorId: id,
      title: descriptor.title,
      location: descriptor.location,
      visible: true,
      active: true,
    }

    this.instances.set(instance.id, instance)
    console.debug(`[PanelRegistry] Opened panel: ${id} (instance: ${instance.id})`)

    // Call lifecycle hook
    descriptor.onActivate?.()

    return instance
  }

  /**
   * Close a panel instance.
   */
  async close(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId)
    if (!instance) return true

    const descriptor = this.descriptors.get(instance.descriptorId)

    // Call lifecycle hook (can prevent close)
    if (descriptor?.onClose) {
      const canClose = await descriptor.onClose()
      if (!canClose) return false
    }

    // Call lifecycle hook
    descriptor?.onDeactivate?.()

    instance.visible = false
    instance.active = false
    this.instances.delete(instanceId)
    console.debug(`[PanelRegistry] Closed panel: ${instanceId}`)

    return true
  }

  /**
   * Get all visible panel instances.
   */
  getVisibleInstances(): PanelInstance[] {
    return Array.from(this.instances.values()).filter((i) => i.visible)
  }

  /**
   * Get the component for a panel descriptor.
   */
  getComponent(id: string): React.ComponentType<PanelComponentProps> | undefined {
    return this.descriptors.get(id)?.component
  }
}

export const PanelRegistry = new PanelRegistryImpl()
