/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { CommandHandler, CommandDescriptor } from '../types'
import { EventBus, Events } from '../events/EventBus'

interface RegisteredCommand {
  handler: CommandHandler
  descriptor: CommandDescriptor
}

class CommandRegistryImpl {
  private commands: Map<string, RegisteredCommand> = new Map()

  registerCommand(
    id: string,
    handler: CommandHandler,
    descriptor?: Partial<CommandDescriptor>
  ): void {
    if (this.commands.has(id)) {
      console.warn(`[CommandRegistry] Overwriting command: ${id}`)
    }
    this.commands.set(id, {
      handler,
      descriptor: {
        id,
        title: descriptor?.title ?? id,
        category: descriptor?.category,
        keybinding: descriptor?.keybinding,
        icon: descriptor?.icon,
      },
    })
  }

  async executeCommand(id: string, ...args: unknown[]): Promise<unknown> {
    const cmd = this.commands.get(id)
    if (!cmd) {
      console.warn(`[CommandRegistry] Unknown command: ${id}`)
      return undefined
    }
    try {
      const result = await cmd.handler(...args)
      EventBus.emit(Events.COMMAND_EXECUTED, { commandId: id, args })
      return result
    } catch (error) {
      console.warn(`[CommandRegistry] Command "${id}" failed:`, error)
      throw error
    }
  }

  getCommands(): CommandDescriptor[] {
    return Array.from(this.commands.values()).map(c => c.descriptor)
  }

  hasCommand(id: string): boolean {
    return this.commands.has(id)
  }

  unregisterCommand(id: string): void {
    this.commands.delete(id)
  }
}

// Singleton instance
export const CommandRegistry = new CommandRegistryImpl()
