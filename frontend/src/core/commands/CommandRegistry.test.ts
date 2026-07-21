/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandRegistry } from './CommandRegistry'

// CommandRegistry is a singleton — clean up between tests
function clearRegistry() {
  const cmds = CommandRegistry.getCommands()
  for (const cmd of cmds) {
    CommandRegistry.unregisterCommand(cmd.id)
  }
}

describe('CommandRegistry', () => {
  beforeEach(() => {
    clearRegistry()
  })

  describe('registerCommand()', () => {
    it('registers a command that can be looked up', () => {
      CommandRegistry.registerCommand('test.cmd', vi.fn(), { title: 'Test Command' })

      expect(CommandRegistry.hasCommand('test.cmd')).toBe(true)
    })

    it('uses id as title when no title is provided', () => {
      CommandRegistry.registerCommand('my.command', vi.fn())

      const cmds = CommandRegistry.getCommands()
      expect(cmds).toHaveLength(1)
      expect(cmds[0].title).toBe('my.command')
    })

    it('preserves optional descriptor fields', () => {
      CommandRegistry.registerCommand('cmd.with.meta', vi.fn(), {
        title: 'With Meta',
        category: 'Test',
        keybinding: 'Ctrl+Shift+T',
        icon: 'zap',
      })

      const cmd = CommandRegistry.getCommands()[0]
      expect(cmd.title).toBe('With Meta')
      expect(cmd.category).toBe('Test')
      expect(cmd.keybinding).toBe('Ctrl+Shift+T')
      expect(cmd.icon).toBe('zap')
    })

    it('warns when overwriting an existing command', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      CommandRegistry.registerCommand('dup.cmd', vi.fn())
      CommandRegistry.registerCommand('dup.cmd', vi.fn())

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting command: dup.cmd')
      )
      warnSpy.mockRestore()
    })
  })

  describe('executeCommand()', () => {
    it('executes a registered command and returns its result', async () => {
      const handler = vi.fn().mockReturnValue(42)
      CommandRegistry.registerCommand('arith.multiply', handler)

      const result = await CommandRegistry.executeCommand('arith.multiply', 6, 7)

      expect(handler).toHaveBeenCalledWith(6, 7)
      expect(result).toBe(42)
    })

    it('supports async handlers', async () => {
      const handler = vi.fn().mockResolvedValue('async-result')
      CommandRegistry.registerCommand('async.cmd', handler)

      const result = await CommandRegistry.executeCommand('async.cmd')

      expect(result).toBe('async-result')
    })

    it('returns undefined for an unknown command', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await CommandRegistry.executeCommand('nonexistent')

      expect(result).toBeUndefined()
      warnSpy.mockRestore()
    })

    it('re-throws errors from the handler', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('cmd failed'))
      CommandRegistry.registerCommand('failing.cmd', handler)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(CommandRegistry.executeCommand('failing.cmd')).rejects.toThrow('cmd failed')
      warnSpy.mockRestore()
    })

    it('emits COMMAND_EXECUTED event on successful execution', async () => {
      // Import EventBus to spy on it
      const { EventBus } = await import('@core/events/EventBus')
      const { Events } = await import('@config/events')

      const handler = vi.fn().mockReturnValue('ok')
      CommandRegistry.registerCommand('emit.test', handler)

      const emitSpy = vi.spyOn(EventBus, 'emit')
      await CommandRegistry.executeCommand('emit.test', 'arg1')

      expect(emitSpy).toHaveBeenCalledWith(Events.COMMAND_EXECUTED, {
        commandId: 'emit.test',
        args: ['arg1'],
      })
      emitSpy.mockRestore()
    })
  })

  describe('getCommands()', () => {
    it('returns all registered commands', () => {
      CommandRegistry.registerCommand('a', vi.fn(), { title: 'A' })
      CommandRegistry.registerCommand('b', vi.fn(), { title: 'B' })
      CommandRegistry.registerCommand('c', vi.fn(), { title: 'C' })

      const cmds = CommandRegistry.getCommands()
      expect(cmds).toHaveLength(3)
      expect(cmds.map((c) => c.id).sort()).toEqual(['a', 'b', 'c'])
    })

    it('returns an empty array when no commands are registered', () => {
      expect(CommandRegistry.getCommands()).toEqual([])
    })
  })

  describe('hasCommand()', () => {
    it('returns true for registered commands', () => {
      CommandRegistry.registerCommand('exists', vi.fn())
      expect(CommandRegistry.hasCommand('exists')).toBe(true)
    })

    it('returns false for unregistered commands', () => {
      expect(CommandRegistry.hasCommand('nope')).toBe(false)
    })
  })

  describe('unregisterCommand()', () => {
    it('removes a registered command', () => {
      CommandRegistry.registerCommand('removable', vi.fn())
      expect(CommandRegistry.hasCommand('removable')).toBe(true)

      CommandRegistry.unregisterCommand('removable')
      expect(CommandRegistry.hasCommand('removable')).toBe(false)
    })

    it('is safe to call for a nonexistent command', () => {
      expect(() => {
        CommandRegistry.unregisterCommand('ghost')
      }).not.toThrow()
    })
  })

  describe('commands with keyboard shortcuts', () => {
    it('stores keybinding in descriptor', () => {
      CommandRegistry.registerCommand(
        'editor.save',
        vi.fn(),
        { title: 'Save', keybinding: 'Ctrl+S', icon: 'save' }
      )

      const cmd = CommandRegistry.getCommands().find((c) => c.id === 'editor.save')!
      expect(cmd.keybinding).toBe('Ctrl+S')
      expect(cmd.icon).toBe('save')
    })

    it('can execute a command that has a keybinding', async () => {
      const handler = vi.fn().mockReturnValue('saved')
      CommandRegistry.registerCommand('editor.save', handler, {
        title: 'Save',
        keybinding: 'Ctrl+S',
      })

      const result = await CommandRegistry.executeCommand('editor.save')
      expect(result).toBe('saved')
    })
  })
})
