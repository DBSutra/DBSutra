/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function parseKeybinding(binding: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string } {
  const parts = binding.split('+').map((s) => s.trim().toLowerCase())
  const key = parts.find((p) => !['ctrl', 'cmd', 'meta', 'alt', 'opt', 'shift'].includes(p)) || ''
  return {
    ctrl: parts.includes('ctrl') || parts.includes('cmd') || parts.includes('meta'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('opt'),
    key,
  }
}

export function matchesKeybinding(e: KeyboardEvent, binding: string): boolean {
  const { ctrl, shift, alt, key } = parseKeybinding(binding)

  let eventKey = e.key.toLowerCase()
  if (e.key === 'ArrowLeft') eventKey = 'arrowleft'
  if (e.key === 'ArrowRight') eventKey = 'arrowright'
  if (e.key === 'ArrowUp') eventKey = 'arrowup'
  if (e.key === 'ArrowDown') eventKey = 'arrowdown'
  if (e.key === ',') eventKey = ','
  if (e.key === '.') eventKey = '.'
  if (e.key === '<') eventKey = '<'
  if (e.key === '>') eventKey = '>'
  if (e.key === '/') eventKey = '/'
  if (e.key === 'Tab') eventKey = 'tab'

  const ctrlMatch = ctrl
    ? (isMac ? e.metaKey : e.ctrlKey)
    : (isMac ? !e.metaKey : !e.ctrlKey)

  return ctrlMatch && (shift ? e.shiftKey : !e.shiftKey) && (alt ? e.altKey : !e.altKey) && eventKey === key
}
