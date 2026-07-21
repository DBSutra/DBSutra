/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Wails runtime — it's not available in test environment
vi.mock('@wailsio/runtime', () => ({
  default: {
    Events: {
      On: vi.fn(),
      Off: vi.fn(),
      Emit: vi.fn(),
    },
    Window: {
      Minimise: vi.fn(),
      Maximise: vi.fn(),
      Close: vi.fn(),
    },
  },
  Events: {
    On: vi.fn(),
    Off: vi.fn(),
    Emit: vi.fn(),
  },
  Window: {
    Minimise: vi.fn(),
    Maximise: vi.fn(),
    Close: vi.fn(),
  },
}))

// Mock Wails generated bindings
vi.mock('@bindings/clientdb/stateservice', () => ({
  Get: vi.fn().mockResolvedValue(''),
  Set: vi.fn().mockResolvedValue(undefined),
  Delete: vi.fn().mockResolvedValue(undefined),
  Keys: vi.fn().mockResolvedValue([]),
}))

vi.mock('@bindings/clientdb/dbservice', () => ({
  Connect: vi.fn().mockResolvedValue('conn-1'),
  Disconnect: vi.fn().mockResolvedValue(undefined),
  Query: vi.fn().mockResolvedValue({ columns: [], rows: [], rowsAffected: 0 }),
  GetSchema: vi.fn().mockResolvedValue([]),
  Ping: vi.fn().mockResolvedValue(undefined),
  ListConnections: vi.fn().mockResolvedValue([]),
  InsertRow: vi.fn().mockResolvedValue(undefined),
  UpdateRow: vi.fn().mockResolvedValue(undefined),
  DeleteRow: vi.fn().mockResolvedValue(undefined),
  CloseAll: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@bindings/clientdb/settingsservice', () => ({
  LoadSettings: vi.fn().mockResolvedValue({}),
  SaveSettings: vi.fn().mockResolvedValue(undefined),
  LoadLayout: vi.fn().mockResolvedValue(''),
  SaveLayout: vi.fn().mockResolvedValue(undefined),
  LoadConnections: vi.fn().mockResolvedValue('[]'),
  SaveConnections: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@bindings/clientdb/fsservice', () => ({
  ReadFile: vi.fn().mockResolvedValue(''),
  WriteFile: vi.fn().mockResolvedValue(undefined),
  FileExists: vi.fn().mockResolvedValue(false),
  ListFiles: vi.fn().mockResolvedValue([]),
  DeleteFile: vi.fn().mockResolvedValue(undefined),
  GetAppDir: vi.fn().mockResolvedValue('/tmp/test-clientdb'),
}))

// Suppress console.debug in tests unless explicitly testing it
vi.spyOn(console, 'debug').mockImplementation(() => {})
