/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { DEBOUNCE_DELAY_DEFAULT } from '@config/commands'
import * as stateService from '@bindings/clientdb/stateservice'

const MODULE = 'goBridge'

/**
 * Generic Go RPC call with proper error handling.
 * Returns null if the method is not found or the call fails.
 */
export async function callGo<T>(method: string, ...args: unknown[]): Promise<T | null> {
  const fn = (stateService as Record<string, unknown>)[method]
  if (typeof fn !== 'function') {
    console.warn(`[${MODULE}] Method not found: "${method}" — available:`, Object.keys(stateService).filter(k => typeof (stateService as Record<string, unknown>)[k] === 'function').join(', '))
    return null
  }

  const startTime = Date.now()
  try {
    console.debug(`[${MODULE}] Calling ${method}(${args.length} args)`)
    const result = await (fn as (...a: unknown[]) => Promise<T>)(...args)
    const duration = Date.now() - startTime
    console.debug(`[${MODULE}] ${method} OK (${duration}ms)`)
    return result
  } catch (err: unknown) {
    const duration = Date.now() - startTime
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStack = err instanceof Error ? err.stack : undefined
    console.error(`[${MODULE}] ${method} FAILED (${duration}ms):`, {
      method,
      args: args.map(a => typeof a === 'string' ? a.substring(0, 100) : typeof a),
      error: errMsg,
      stack: errStack,
      timestamp: new Date().toISOString(),
    })
    return null
  }
}

/** Fire-and-forget Go call (errors are logged but not thrown). */
export function fireGo(method: string, ...args: unknown[]) {
  callGo(method, ...args).catch((err) => {
    console.error(`[${MODULE}] Fire-and-forget ${method} failed:`, err)
  })
}

/** Debounced save helper with per-key timer tracking. */
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export function debouncedSave(key: string, fn: () => Promise<void>, delay = DEBOUNCE_DELAY_DEFAULT) {
  if (saveTimers[key]) clearTimeout(saveTimers[key])
  saveTimers[key] = setTimeout(() => {
    fn()
      .then(() => console.debug(`[${MODULE}] Debounced save OK: "${key}"`))
      .catch((err) => console.error(`[${MODULE}] Debounced save failed for "${key}":`, err))
  }, delay)
}
