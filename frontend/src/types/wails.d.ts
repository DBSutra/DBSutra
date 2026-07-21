/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
/**
 * Wails v3 runtime type declarations.
 * These types describe the Go-to-JS bridge injected by Wails v3 at runtime.
 */

declare module '@wailsio/runtime' {
  export const Call: {
    ByID(id: number, ...args: unknown[]): Promise<unknown>
  }

  export class CancellablePromise<T> extends Promise<T> {
    cancel(): void
  }

  export const Create: {
    ByID(id: number, ...args: unknown[]): Promise<unknown>
  }

  export const Events: {
    On(event: string, handler: (data: unknown) => void): void
    Emit(event: string, data?: unknown): void
    Off(event: string, handler?: (data: unknown) => void): void
  }

  export const Window: {
    GetCurrent(): Promise<Window>
  }
}

declare module '@bindings/clientdb/dbservice' {
  export function Connect(cfg: Record<string, unknown>): Promise<string>
  export function Disconnect(connID: string): Promise<void>
  export function Ping(connID: string): Promise<void>
  export function Query(connID: string, sql: string): Promise<unknown>
  export function GetSchema(connID: string): Promise<unknown>
  export function ListConnections(): Promise<string[]>
  export function InsertRow(connID: string, database: string, table: string, data: Record<string, unknown>): Promise<void>
  export function UpdateRow(connID: string, database: string, table: string, keys: Record<string, unknown>, data: Record<string, unknown>): Promise<void>
  export function DeleteRow(connID: string, database: string, table: string, keys: Record<string, unknown>): Promise<void>
  export function CloseAll(): Promise<void>
}

declare module '@bindings/clientdb/stateservice' {
  export function LoadAllConfig(): Promise<string>
  export function LoadSettings(): Promise<string>
  export function LoadConnections(): Promise<string>
  export function Get(key: string): Promise<string>
  export function Set(key: string, value: string): Promise<void>
  export function SaveAppearance(key: string, value: string): Promise<void>
  export function SaveFont(key: string, value: string): Promise<void>
  export function SavePanelConfig(key: string, value: string): Promise<void>
  export function SaveDockLayout(payload: string): Promise<void>
  export function SaveShortcut(cmdId: string, keybinding: string): Promise<void>
  export function SaveColorOverride(token: string, value: string): Promise<void>
  export function DeleteColorOverride(token: string): Promise<void>
  export function SeedColorOverrides(json: string): Promise<void>
  export function ReplaceColorOverrides(json: string): Promise<void>
  export function SaveTheme(id: string, name: string, colors: string, isBuiltin: boolean): Promise<void>
  export function DeleteTheme(id: string): Promise<void>
  export function SaveConnection(id: string, name: string, type: string, json: string): Promise<void>
  export function DeleteConnection(id: string): Promise<void>
  export function AddQueryHistory(connId: string, query: string, status: string, rows: number, duration: number): Promise<void>
  export function LoadQueryHistory(limit: number): Promise<string>
  export function LoadThemes(): Promise<string>
  export function Close(): Promise<void>
}
