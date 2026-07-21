/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useEffect, useRef } from 'react'
import { EventBus } from '@core/events/EventBus'

/**
 * Subscribes to an EventBus event with automatic cleanup on unmount.
 * Prevents stale closures by keeping the handler ref up to date.
 *
 * @param event - The event name to subscribe to
 * @param handler - The handler function (called with event payload)
 * @param deps - Additional dependencies that should re-subscribe
 *
 * @example
 * useEventBus(Events.QUERY_COMPLETED, (result) => {
 *   setResult(result as QueryResult)
 * })
 */
export function useEventBus(
  event: string,
  handler: (payload: unknown) => void,
  deps: React.DependencyList = []
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const wrappedHandler = (payload: unknown) => handlerRef.current(payload)
    return EventBus.on(event as any, wrappedHandler as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps])
}
