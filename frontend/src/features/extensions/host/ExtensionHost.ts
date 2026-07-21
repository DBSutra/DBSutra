/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionManifest } from '@core/types'
import { ExtensionContext } from './ExtensionContext'
import { ManifestValidator } from './ManifestValidator'
import { useAppStore } from '@core/state/store'
import { EventBus, Events } from '@core/events/EventBus'
import { logError } from '@shared/utils/errors'

type ActivateFn = (ctx: ExtensionContext) => void | Promise<void>

interface LoadedExtension {
  manifest: ExtensionManifest
  context: ExtensionContext
  activate: ActivateFn
}

const CTX = { module: 'ExtensionHost', operation: '' }

class ExtensionHostImpl {
  private extensions: Map<string, LoadedExtension> = new Map()

  async loadExtension(
    manifest: unknown,
    activate: ActivateFn
  ): Promise<void> {
    const { valid, errors } = ManifestValidator.validate(manifest)
    if (!valid) {
      logError(new Error(`Invalid manifest: ${errors.join(', ')}`), {
        ...CTX, operation: 'validateManifest', severity: 'high',
        details: { errors },
      })
      return
    }

    const m = ManifestValidator.cast(manifest)

    if (this.extensions.has(m.id)) {
      console.warn(`[ExtensionHost] Extension already loaded: ${m.id}`)
      return
    }

    const ctx = new ExtensionContext(m.id)

    try {
      await activate(ctx)
      this.extensions.set(m.id, { manifest: m, context: ctx, activate })

      const store = useAppStore.getState()
      store.registerExtension(m)
      store.activateExtension(m.id)

      EventBus.emit(Events.EXTENSION_ACTIVATED, { extensionId: m.id })
      console.log(`[ExtensionHost] Activated: ${m.name} v${m.version}`)
    } catch (err) {
      logError(err, {
        ...CTX, operation: `activate:${m.id}`, severity: 'high',
        details: { extensionId: m.id, extensionName: m.name, version: m.version },
      })
      ctx.dispose()
    }
  }

  deactivateExtension(id: string): void {
    const ext = this.extensions.get(id)
    if (!ext) {
      console.warn(`[ExtensionHost] Extension not found: ${id}`)
      return
    }
    ext.context.dispose()
    this.extensions.delete(id)
    EventBus.emit(Events.EXTENSION_DEACTIVATED, { extensionId: id })
  }

  getExtension(id: string): LoadedExtension | undefined {
    return this.extensions.get(id)
  }

  getActiveExtensions(): ExtensionManifest[] {
    return Array.from(this.extensions.values()).map((e) => e.manifest)
  }
}

export const ExtensionHost = new ExtensionHostImpl()
