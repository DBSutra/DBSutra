/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
/**
 * Service tokens for dependency injection.
 * Each token identifies a service in the container.
 */
export const TOKENS = {
  EventBus: Symbol('EventBus'),
  CommandRegistry: Symbol('CommandRegistry'),
  PanelRegistry: Symbol('PanelRegistry'),
  ConnectionManager: Symbol('ConnectionManager'),
  ThemeEngine: Symbol('ThemeEngine'),
  SettingsEngine: Symbol('SettingsEngine'),
  ExtensionHost: Symbol('ExtensionHost'),
  DatabaseRegistry: Symbol('DatabaseRegistry'),
} as const

export type ServiceToken = (typeof TOKENS)[keyof typeof TOKENS]
