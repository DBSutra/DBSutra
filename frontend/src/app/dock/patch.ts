/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import DockLayout from 'rc-dock'

/**
 * Monkey-patches rc-dock's DockLayout prototype to:
 * 1. Fix the "null is not an object" crash when dragging tabs in edge drop mode
 * 2. Add VS Code / LeetCode style center drop zone behavior
 *
 * This runs once at import time and patches the prototype before any DockLayout is rendered.
 */
export function applyDockPatch(): void {
  if (!DockLayout?.prototype || (DockLayout.prototype as any).__patchedSetDropRect) return

  const originalSetDropRect = DockLayout.prototype.setDropRect
  const originalDockMove = DockLayout.prototype.dockMove

  ;(DockLayout.prototype as any).__patchedSetDropRect = true

  DockLayout.prototype.setDropRect = function (
    element: any,
    direction: any,
    source: any,
    event: any,
    panelSize: any
  ) {
    // Fix the crash on 'remove' direction
    if (direction === 'remove') {
      if (this.state.dropRect) {
        this.setState((oldStates: any) => {
          if (oldStates.dropRect && oldStates.dropRect.source === source) {
            return { dropRect: null as any }
          }
          return {}
        })
      }
      return
    }

    // VS Code / LeetCode style center drop zone
    if (
      element?.classList?.contains('dock-panel') &&
      event?.clientX !== undefined
    ) {
      const rect = element.getBoundingClientRect()
      const widthRate = Math.min(rect.width, 500)
      const heightRate = Math.min(rect.height, 500)
      const left = (event.clientX - rect.left) / widthRate
      const right = (rect.right - event.clientX) / widthRate
      const top = (event.clientY - rect.top) / heightRate
      const bottom = (rect.bottom - event.clientY) / heightRate
      const min = Math.min(left, right, top, bottom)

      if (min >= 0.3) {
        if (element.classList.contains('dragging')) {
          this.setState({ dropRect: null as any })
          return
        } else {
          direction = 'middle'
          ;(this as any).__lastMiddleDrop = Date.now()
        }
      } else {
        ;(this as any).__lastMiddleDrop = 0
      }
    }

    return originalSetDropRect.call(this, element, direction, source, event, panelSize)
  }

  DockLayout.prototype.dockMove = function (
    source: any,
    target: any,
    direction: any,
    floatPosition: any
  ) {
    if ((this as any).__lastMiddleDrop && Date.now() - (this as any).__lastMiddleDrop < 1000) {
      direction = 'middle'
      ;(this as any).__lastMiddleDrop = 0
    }
    return originalDockMove.call(this, source, target, direction, floatPosition)
  }
}
