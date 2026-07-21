/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type {
  CommandHandler,
  CommandDescriptor,
  DatabaseDriver,
  Theme,
} from '@core/types'
import { CommandRegistry } from '@core/commands/CommandRegistry'
import { EventBus } from '@core/events/EventBus'
import { PanelManager } from '@core/panels/PanelManager'
import { ThemeEngine } from '@core/theme/ThemeEngine'
import { useAppStore } from '@core/state/store'

// Per-extension API context (sandboxed view)
export class ExtensionContext {
  private extensionId: string
  private unsubs: Array<() => void> = []

  constructor(extensionId: string) {
    this.extensionId = extensionId
  }

  registerCommand(
    id: string,
    handler: CommandHandler,
    descriptor?: Partial<CommandDescriptor>
  ): void {
    const fullId = `${this.extensionId}.${id}`
    CommandRegistry.registerCommand(fullId, handler, {
      ...descriptor,
      category: this.extensionId,
    })
  }

  registerView(id: string, descriptor: { title?: string; icon?: string; component: React.FC<{ panelId: string }>; location?: string; defaultLocation?: 'left' | 'main' | 'bottom' }): void {
    PanelManager.register({
      id,
      title: descriptor.title ?? id,
      icon: descriptor.icon ?? 'puzzle',
      component: descriptor.component,
      defaultLocation: (descriptor.defaultLocation ?? descriptor.location ?? 'main') as 'left' | 'main' | 'bottom',
    })
  }

  registerDatabase(_driver: DatabaseDriver): void {
    // DB driver registration — Go side handles actual wire protocol
    // This registers the frontend UI component
    console.log(`[ExtensionHost] DB driver UI registered: ${_driver.type}`)
  }

  registerTheme(theme: Theme): void {
    ThemeEngine.registerTheme(theme)
    useAppStore.getState().registerTheme(theme)
  }

  getState() {
    return useAppStore.getState()
  }

  subscribe(event: string, handler: (payload: unknown) => void): () => void {
    const unsub = EventBus.on(event as any, handler as any)
    this.unsubs.push(unsub)
    return unsub
  }

  emit(event: string, payload?: unknown): void {
    EventBus.emit(event as any, payload as any)
  }

  getConfig<T>(key: string): T {
    return useAppStore.getState().getSetting<T>(key)
  }

  // Called when extension is deactivated — cleanup subscriptions
  dispose(): void {
    this.unsubs.forEach(u => u())
    this.unsubs = []
  }
}
