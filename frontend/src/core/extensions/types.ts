/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type React from 'react'

/**
 * Extension manifest — declared in manifest.json
 */
export interface ExtensionManifest {
  id: string
  name: string
  version: string
  description?: string
  icon?: string
  author?: string
  activationEvents: ActivationEvent[]
  contributes: ExtensionContributions
  dependencies?: string[]
}

export type ActivationEvent =
  | 'onStartup'
  | `onDatabaseConnect:${string}`
  | `onCommand:${string}`
  | `onView:${string}`

export interface ExtensionContributions {
  commands?: CommandContribution[]
  views?: ViewContribution[]
  editors?: EditorContribution[]
  databases?: DatabaseContribution[]
  themes?: ThemeContribution[]
  settings?: SettingContribution[]
  menus?: MenuContribution[]
  statusbar?: StatusBarContribution[]
  keybindings?: KeybindingContribution[]
}

export interface CommandContribution {
  id: string
  title: string
  category?: string
  icon?: string
  enablement?: string
  keybinding?: string
}

export interface ViewContribution {
  id: string
  title: string
  icon: string
  location: 'sidebar' | 'panel' | 'activitybar' | 'editor'
  group?: string
  order?: number
  when?: string
  component: React.ComponentType<PanelProps>
}

export interface EditorContribution {
  id: string
  title: string
  icon: string
  language?: string
  component: React.ComponentType<EditorProps>
}

export interface DatabaseContribution {
  type: string
  label: string
  icon: string
  defaultPort: number
  connectionForm: React.ComponentType<ConnectionFormProps>
  queryLanguage?: string
  supportsSSH?: boolean
  supportsSSL?: boolean
}

export interface ThemeContribution {
  id: string
  name: string
  colors: Record<string, string>
}

export interface SettingContribution {
  key: string
  type: 'string' | 'number' | 'boolean' | 'enum'
  default: unknown
  description: string
  enum?: string[]
}

export interface MenuContribution {
  command: string
  when?: string
  group?: string
}

export interface StatusBarContribution {
  id: string
  text: string
  tooltip?: string
  command?: string
  alignment?: 'left' | 'right'
  priority?: number
}

export interface KeybindingContribution {
  command: string
  key: string
  when?: string
  mac?: string
  linux?: string
}

export interface PanelProps {
  panelId: string
  isActive?: boolean
  onTitleChange?: (title: string) => void
}

export interface EditorProps {
  tabId: string
  isActive?: boolean
}

export interface ConnectionFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
  onError?: (error: string) => void
}

/**
 * Loaded extension instance
 */
export interface LoadedExtension {
  manifest: ExtensionManifest
  activate: (ctx: ExtensionContextAPI) => void | Promise<void>
  deactivate?: () => void | Promise<void>
  context?: ExtensionContextAPI
  active: boolean
}

/**
 * API available to extensions during activation
 */
export interface ExtensionContextAPI {
  registerCommand(id: string, handler: (...args: unknown[]) => unknown, descriptor?: Partial<CommandContribution>): void
  registerView(id: string, descriptor: Omit<ViewContribution, 'id'>): void
  registerDatabase(descriptor: DatabaseContribution): void
  registerTheme(theme: ThemeContribution): void
  subscriptions: { dispose(): void }[]
  dispose(): void
}
