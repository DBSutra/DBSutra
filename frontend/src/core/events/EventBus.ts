/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { AppEventMap, EventHandler } from './types'

type EventName = keyof AppEventMap

/**
 * Type-safe event bus.
 * Events are defined in AppEventMap for full type inference.
 */
class EventBusImpl {
  private listeners = new Map<string, Set<EventHandler<unknown>>>()

  /**
   * Emit an event with typed payload.
   */
  emit<K extends EventName>(event: K, payload?: AppEventMap[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers && handlers.size > 0) {
      console.debug(`[EventBus] Emitting "${event}" to ${handlers.size} handler(s)`)
      handlers.forEach((h) => {
        try {
          h(payload as unknown)
        } catch (e) {
          console.error(`[EventBus] Handler error for "${event}":`, {
            error: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined,
            event,
            timestamp: new Date().toISOString(),
          })
        }
      })
    }

    // Wildcard listeners
    const wildcardHandlers = this.listeners.get('*')
    if (wildcardHandlers && wildcardHandlers.size > 0) {
      wildcardHandlers.forEach((h) => {
        try {
          h({ event, payload })
        } catch (e) {
          console.error('[EventBus] Wildcard handler error:', {
            event,
            error: e instanceof Error ? e.message : String(e),
            timestamp: new Date().toISOString(),
          })
        }
      })
    }
  }

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends EventName>(event: K, handler: EventHandler<AppEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const wrappedHandler = handler as EventHandler<unknown>
    this.listeners.get(event)!.add(wrappedHandler)
    console.debug(`[EventBus] Subscribed to "${event}" (total: ${this.listeners.get(event)!.size})`)

    return () => {
      this.listeners.get(event)?.delete(wrappedHandler)
      console.debug(`[EventBus] Unsubscribed from "${event}"`)
    }
  }

  /**
   * Subscribe to an event once. Auto-unsubscribes after first call.
   */
  once<K extends EventName>(event: K, handler: EventHandler<AppEventMap[K]>): void {
    const wrapper: EventHandler<AppEventMap[K]> = (payload) => {
      handler(payload)
      this.listeners.get(event)?.delete(wrapper as EventHandler<unknown>)
    }
    this.on(event, wrapper)
  }

  /**
   * Clear handlers for a specific event, or all events.
   */
  clear(event?: EventName): void {
    if (event) {
      const count = this.listeners.get(event)?.size ?? 0
      this.listeners.delete(event)
      console.debug(`[EventBus] Cleared "${event}" (${count} handlers)`)
    } else {
      const total = Array.from(this.listeners.values()).reduce((sum, s) => sum + s.size, 0)
      this.listeners.clear()
      console.debug(`[EventBus] Cleared all events (${total} handlers)`)
    }
  }
}

export const EventBus = new EventBusImpl()

// Backward-compatible exports
export { Events } from '@config/events'
export type { AppEventMap }
