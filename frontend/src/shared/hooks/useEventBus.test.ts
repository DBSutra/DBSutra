/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEventBus } from './useEventBus'
import { EventBus } from '@core/events/EventBus'
import { Events } from '@config/events'

describe('useEventBus', () => {
  beforeEach(() => {
    EventBus.clear()
  })

  it('subscribes to the event and calls the handler', () => {
    const handler = vi.fn()

    renderHook(() => useEventBus(Events.DB_CONNECTED, handler))

    EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ connId: 'c1', type: 'mysql', name: 'db' })
  })

  it('unsubscribes on unmount', () => {
    const handler = vi.fn()

    const { unmount } = renderHook(() => useEventBus(Events.DB_CONNECTED, handler))

    unmount()

    EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('uses the latest handler via ref (avoids stale closure)', () => {
    let value = 'first'
    const handler = vi.fn(() => value)

    const { rerender } = renderHook(() => useEventBus(Events.DB_CONNECTED, handler))

    value = 'updated'
    rerender()

    EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })

    // The handler reference updates on each render, so the latest is used
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.results[0].value).toBe('updated')
  })

  it('resubscribes when the event name changes', () => {
    const handler = vi.fn()

    const { rerender } = renderHook(
      ({ event }) => useEventBus(event, handler),
      { initialProps: { event: Events.DB_CONNECTED } }
    )

    rerender({ event: Events.QUERY_COMPLETED })

    EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })
    expect(handler).not.toHaveBeenCalled()

    EventBus.emit(Events.QUERY_COMPLETED, { connId: 'c1', rows: 5, duration: 10 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('resubscribes when deps change', () => {
    const handler = vi.fn()

    const { rerender } = renderHook(
      ({ dep }) => useEventBus(Events.DB_CONNECTED, handler, [dep]),
      { initialProps: { dep: 'a' } }
    )

    // Change dep — should unsubscribe old and subscribe new
    rerender({ dep: 'b' })

    EventBus.emit(Events.DB_CONNECTED, { connId: 'c1', type: 'mysql', name: 'db' })
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
