/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from './EventBus'
import { Events } from '@config/events'

// The EventBus is a singleton — we need to clear it between tests
// so listeners don't leak across test cases.
function clearBus() {
  EventBus.clear()
}

describe('EventBus', () => {
  beforeEach(() => {
    clearBus()
  })

  describe('on()', () => {
    it('registers a listener and returns an unsubscribe function', () => {
      const handler = vi.fn()
      const unsub = EventBus.on(Events.DB_CONNECTED, handler)

      expect(typeof unsub).toBe('function')
    })

    it('calls the handler when the event is emitted', () => {
      const handler = vi.fn()
      EventBus.on(Events.DB_CONNECTED, handler)

      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'test' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ connId: 'c1', type: 'mysql', name: 'test' })
    })

    it('supports multiple registrations for the same event', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      EventBus.on(Events.DB_CONNECTED, h1)
      EventBus.on(Events.DB_CONNECTED, h2)

      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

      expect(h1).toHaveBeenCalledTimes(1)
      expect(h2).toHaveBeenCalledTimes(1)
    })
  })

  describe('off() / unsubscribe', () => {
    it('removes a listener when unsubscribe is called', () => {
      const handler = vi.fn()
      const unsub = EventBus.on(Events.DB_CONNECTED, handler)

      unsub()
      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

      expect(handler).not.toHaveBeenCalled()
    })

    it('only removes the targeted listener, leaving others intact', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      const unsub1 = EventBus.on(Events.DB_CONNECTED, h1)
      EventBus.on(Events.DB_CONNECTED, h2)

      unsub1()
      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

      expect(h1).not.toHaveBeenCalled()
      expect(h2).toHaveBeenCalledTimes(1)
    })

    it('is safe to call unsubscribe twice', () => {
      const handler = vi.fn()
      const unsub = EventBus.on(Events.DB_CONNECTED, handler)

      unsub()
      unsub() // second call should be a no-op

      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('emit()', () => {
    it('does nothing when no listeners are registered', () => {
      // Should not throw
      expect(() => {
        EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })
      }).not.toThrow()
    })

    it('delivers the payload to registered handlers', () => {
      const handler = vi.fn()
      EventBus.on(Events.QUERY_COMPLETED, handler)

      const payload = { connId: 'c1', rows: 42, duration: 120 }
      EventBus.emit(Events.QUERY_COMPLETED, payload)

      expect(handler).toHaveBeenCalledWith(payload)
    })

    it('works with events that have undefined payload', () => {
      const handler = vi.fn()
      EventBus.on(Events.LAYOUT_CHANGED, handler)

      EventBus.emit(Events.LAYOUT_CHANGED)

      expect(handler).toHaveBeenCalled()
    })

    it('calls wildcard listeners with wrapped event info', () => {
      const wildcard = vi.fn()
      EventBus.on('*' as any, wildcard)

      const payload = { connId: 'c1', type: 'mysql', name: 'db' }
      EventBus.emit(Events.DB_CONNECTED, payload)

      expect(wildcard).toHaveBeenCalledWith({ event: Events.DB_CONNECTED, payload })
    })
  })

  describe('error isolation', () => {
    it('does not break other listeners when one throws', () => {
      const badHandler = vi.fn(() => {
        throw new Error('boom')
      })
      const goodHandler = vi.fn()

      // Suppress console.error for this test
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      EventBus.on(Events.DB_CONNECTED, badHandler)
      EventBus.on(Events.DB_CONNECTED, goodHandler)

      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

      expect(badHandler).toHaveBeenCalledTimes(1)
      expect(goodHandler).toHaveBeenCalledTimes(1)
      expect(goodHandler).toHaveBeenCalledWith({ connId: 'c1', type: 'mysql', name: 'db' })

      errorSpy.mockRestore()
    })

    it('logs the error to console.error', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const handler = vi.fn(() => { throw new Error('test failure') })

      EventBus.on(Events.DB_CONNECTED, handler)
      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

      expect(errorSpy).toHaveBeenCalledTimes(1)
      const logged = errorSpy.mock.calls[0]
      expect(logged[0]).toContain('Handler error')

      errorSpy.mockRestore()
    })
  })

  describe('once()', () => {
    it('auto-unsubscribes after first emission', () => {
      const handler = vi.fn()
      EventBus.once(Events.DB_CONNECTED, handler)

      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })
      EventBus.emit(Events.DB_CONNECTED, { connId: 'c2', type: 'postgres', name: 'db2' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ connId: 'c1', type: 'mysql', name: 'db' })
    })
  })

  describe('clear()', () => {
    it('clears all listeners for a specific event', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      EventBus.on(Events.DB_CONNECTED, h1)
      EventBus.on(Events.QUERY_COMPLETED, h2)

      EventBus.clear(Events.DB_CONNECTED)

      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })
      EventBus.emit(Events.QUERY_COMPLETED, { connId: 'c1', rows: 10, duration: 50 })

      expect(h1).not.toHaveBeenCalled()
      expect(h2).toHaveBeenCalledTimes(1)
    })

    it('clears all listeners when called without arguments', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      EventBus.on(Events.DB_CONNECTED, h1)
      EventBus.on(Events.QUERY_COMPLETED, h2)

      EventBus.clear()

      EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })
      EventBus.emit(Events.QUERY_COMPLETED, { connId: 'c1', rows: 10, duration: 50 })

      expect(h1).not.toHaveBeenCalled()
      expect(h2).not.toHaveBeenCalled()
    })
  })
})
