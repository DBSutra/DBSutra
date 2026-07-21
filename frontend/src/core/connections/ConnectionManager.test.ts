/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ConnectionConfig } from '@core/types'

// Mock the backend bindings before importing ConnectionManager
vi.mock('@bindings/clientdb/dbservice', () => ({
  Connect: vi.fn().mockResolvedValue('conn-1'),
  GetSchema: vi.fn().mockResolvedValue([]),
}))

vi.mock('@bindings/clientdb/stateservice', () => ({
  Set: vi.fn().mockResolvedValue(undefined),
  SaveConnection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@core/state/store', () => {
  const mockStore = {
    addSavedConnection: vi.fn(),
    setConnectionStatus: vi.fn(),
    setSchemaCache: vi.fn(),
    openTab: vi.fn(),
  }
  return {
    useAppStore: {
      getState: vi.fn(() => mockStore),
    },
    __mockStore: mockStore,
  }
})

vi.mock('@shared/utils', () => ({
  getLanguageForDbType: vi.fn((type: string) => (type === 'mongodb' ? 'javascript' : 'sql')),
  getEditorLanguage: vi.fn().mockReturnValue('sql'),
  getConnectionById: vi.fn(),
  getConnectionName: vi.fn(),
  getConnectionType: vi.fn(),
}))

import { ConnectionManager } from './ConnectionManager'
import { Connect, GetSchema } from '@bindings/clientdb/dbservice'
import { SaveConnection } from '@bindings/clientdb/stateservice'

// Access the mocked store to assert against it
const { useAppStore } = await import('@core/state/store')
const mockStore = useAppStore.getState()

function makeConfig(overrides: Partial<ConnectionConfig> = {}): ConnectionConfig {
  return {
    id: 'cfg-1',
    name: 'Test DB',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'testdb',
    username: 'root',
    password: '',
    ssl: false,
    ...overrides,
  }
}

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Connect).mockResolvedValue('conn-1')
    vi.mocked(GetSchema).mockResolvedValue([])
    vi.mocked(SaveConnection).mockResolvedValue(undefined)
  })

  describe('connect()', () => {
    it('calls backend Connect with the config', async () => {
      const config = makeConfig()
      await ConnectionManager.connect(config)

      expect(Connect).toHaveBeenCalledOnce()
    })

    it('returns the connection ID from the backend', async () => {
      vi.mocked(Connect).mockResolvedValue('conn-abc-123')
      const config = makeConfig()

      const connId = await ConnectionManager.connect(config)

      expect(connId).toBe('conn-abc-123')
    })

    it('saves the connection to the store', async () => {
      const config = makeConfig()
      await ConnectionManager.connect(config)

      expect(mockStore.addSavedConnection).toHaveBeenCalledWith(config)
    })

    it('persists the connection to SQLite via SaveConnection', async () => {
      const config = makeConfig()
      await ConnectionManager.connect(config)

      expect(SaveConnection).toHaveBeenCalledWith(
        'cfg-1',
        'Test DB',
        'mysql',
        expect.any(String)
      )
    })

    it('sets the connection status to connected', async () => {
      const config = makeConfig()
      await ConnectionManager.connect(config)

      expect(mockStore.setConnectionStatus).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({
          id: 'conn-1',
          name: 'Test DB',
          type: 'mysql',
          status: 'connected',
        })
      )
    })

    it('fetches and caches the schema', async () => {
      const fakeSchema = [{ name: 'db1', tables: [] }]
      vi.mocked(GetSchema).mockResolvedValue(fakeSchema)
      const config = makeConfig()

      await ConnectionManager.connect(config)

      expect(GetSchema).toHaveBeenCalledWith('conn-1')
      expect(mockStore.setSchemaCache).toHaveBeenCalledWith('conn-1', fakeSchema)
    })

    it('does not throw when schema fetch fails', async () => {
      vi.mocked(GetSchema).mockRejectedValue(new Error('schema error'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const config = makeConfig()

      await expect(ConnectionManager.connect(config)).resolves.toBeDefined()
      warnSpy.mockRestore()
    })

    it('does not throw when SaveConnection fails', async () => {
      vi.mocked(SaveConnection).mockRejectedValue(new Error('save failed'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const config = makeConfig()

      await expect(ConnectionManager.connect(config)).resolves.toBeDefined()
      warnSpy.mockRestore()
    })

    it('re-throws when backend Connect fails', async () => {
      vi.mocked(Connect).mockRejectedValue(new Error('connection refused'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const config = makeConfig()

      await expect(ConnectionManager.connect(config)).rejects.toThrow('connection refused')
      errorSpy.mockRestore()
    })

    describe('autoOpenTab', () => {
      it('opens a query tab when autoOpenTab is true', async () => {
        const config = makeConfig()
        await ConnectionManager.connect(config, true)

        expect(mockStore.openTab).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Query — Test DB',
            connectionId: 'conn-1',
            dbType: 'mysql',
            isDirty: false,
          })
        )
      })

      it('does not open a tab when autoOpenTab is false (default)', async () => {
        const config = makeConfig()
        await ConnectionManager.connect(config)

        expect(mockStore.openTab).not.toHaveBeenCalled()
      })

      it('uses mongo content for mongodb connections', async () => {
        const config = makeConfig({ type: 'mongodb' })
        await ConnectionManager.connect(config, true)

        expect(mockStore.openTab).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('db.collection'),
            language: 'javascript',
          })
        )
      })
    })
  })
})
