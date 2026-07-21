/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type React from 'react'

/**
 * Panel location in the UI layout
 */
export type PanelLocation = 'sidebar' | 'editor' | 'panel' | 'activitybar'

/**
 * Panel lifecycle hooks
 */
export interface PanelLifecycle {
  onActivate?(): void
  onDeactivate?(): void
  onResize?(width: number, height: number): void
  onClose?(): boolean | Promise<boolean>
  onFocus?(): void
  onBlur?(): void
}

/**
 * Props passed to panel components
 */
export interface PanelComponentProps {
  panelId: string
  isActive: boolean
  onTitleChange?: (title: string) => void
  onIconChange?: (icon: string) => void
}

/**
 * Full panel descriptor
 */
export interface PanelDescriptor extends PanelLifecycle {
  id: string
  title: string
  icon: string
  component: React.ComponentType<PanelComponentProps>
  location: PanelLocation
  group?: string
  order?: number
  when?: string
  canMove?: boolean
  singleton?: boolean
  defaultSize?: number
  closable?: boolean
  extensionId?: string  // set automatically by ExtensionHost
}

/**
 * Panel instance (a panel that's been opened in the UI)
 */
export interface PanelInstance {
  id: string
  descriptorId: string
  title: string
  location: PanelLocation
  visible: boolean
  active: boolean
}
