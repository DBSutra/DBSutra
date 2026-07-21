/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { PANEL_ORDER } from '@config/commands'

export function isEditingContext(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el.isContentEditable) return true
  if (el.closest('.cm-editor')) return true
  return false
}

export const ALWAYS_ACTIVE_COMMANDS = new Set([
  'workbench.action.showCommands',
  'workbench.action.newQuery',
  'workbench.action.closeActiveTab',
  'workbench.action.nextTab',
  'workbench.action.previousTab',
  'editor.action.saveTab',
  'editor.action.runQuery',
  'editor.action.runQueryAlt',
  'workbench.action.openSettings',
  'workbench.action.toggleSidebar',
  'workbench.action.maximizePanel',
  'workbench.action.minimizePanel',
  ...Array.from({ length: 9 }, (_, i) => `workbench.action.focusPanel.${PANEL_ORDER[i]}`),
])
