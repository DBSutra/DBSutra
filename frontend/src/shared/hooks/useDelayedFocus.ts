/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useCallback, type RefObject } from 'react'
import { FOCUS_DELAY_MS } from '../constants/defaults'

/**
 * Returns a callback that focuses the referenced input after a short delay.
 * Useful for focusing inputs that are conditionally rendered.
 *
 * @param ref - React ref to the input element
 * @param delay - Delay in ms before focusing (default: FOCUS_DELAY_MS)
 *
 * @example
 * const inputRef = useRef<HTMLInputElement>(null)
 * const focusInput = useDelayedFocus(inputRef)
 * <button onClick={focusInput}>Search</button>
 */
export function useDelayedFocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  delay = FOCUS_DELAY_MS
): () => void {
  return useCallback(() => {
    setTimeout(() => ref.current?.focus(), delay)
  }, [ref, delay])
}
