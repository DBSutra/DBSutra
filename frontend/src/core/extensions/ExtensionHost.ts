/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type {
  ExtensionManifest,
  LoadedExtension,
  ExtensionContextAPI,
  ViewContribution,
  DatabaseContribution,
} from './types'
import { ManifestValidator } from './ManifestValidator'

/**
 * Extension Host — manages extension lifecycle.
 */
class ExtensionHostImpl {
  private extensions = new Map<string, LoadedExtension>()
  private views = new Map<string, ViewContribution>()
  private databases = new Map<string, DatabaseContribution>()

  /**
   * Load and activate an extension.
   */
  async loadExtension(
    manifest: ExtensionManifest,
    activate: (ctx: ExtensionContextAPI) => void | Promise<void>,
    deactivate?: () => void | Promise<void>
  ): Promise<void> {
    // Validate manifest
    const errors = ManifestValidator.validate(manifest)
    if (errors.length > 0) {
      console.error(`[ExtensionHost] Invalid manifest for "${manifest.id}":`, errors)
      return
    }

    if (this.extensions.has(manifest.id)) {
      console.warn(`[ExtensionHost] Extension "${manifest.id}" already loaded, skipping`)
      return
    }

    console.info(`[ExtensionHost] Loading extension: ${manifest.id} v${manifest.version}`)

    // Create extension context
    const context = this.createContext(manifest.id)

    const extension: LoadedExtension = {
      manifest,
      activate,
      deactivate,
      context,
      active: false,
    }

    this.extensions.set(manifest.id, extension)

    // Activate
    try {
      await activate(context)
      extension.active = true
      console.info(`[ExtensionHost] Extension "${manifest.id}" activated`)
    } catch (err) {
      console.error(`[ExtensionHost] Failed to activate "${manifest.id}":`, err)
    }
  }

  /**
   * Deactivate an extension.
   */
  async deactivateExtension(id: string): Promise<void> {
    const ext = this.extensions.get(id)
    if (!ext) {
      console.warn(`[ExtensionHost] Extension "${id}" not found`)
      return
    }

    if (!ext.active) return

    console.info(`[ExtensionHost] Deactivating extension: ${id}`)

    try {
      // Call extension's deactivate hook
      if (ext.deactivate) {
        await ext.deactivate()
      }

      // Dispose all subscriptions
      ext.context?.dispose()

      ext.active = false
      console.info(`[ExtensionHost] Extension "${id}" deactivated`)
    } catch (err) {
      console.error(`[ExtensionHost] Error deactivating "${id}":`, err)
    }
  }

  /**
   * Get all loaded extensions.
   */
  getExtensions(): LoadedExtension[] {
    return Array.from(this.extensions.values())
  }

  /**
   * Get an extension by ID.
   */
  getExtension(id: string): LoadedExtension | undefined {
    return this.extensions.get(id)
  }

  /**
   * Get all registered views (from all extensions).
   */
  getViews(): ViewContribution[] {
    return Array.from(this.views.values())
  }

  /**
   * Get all registered database types.
   */
  getDatabases(): DatabaseContribution[] {
    return Array.from(this.databases.values())
  }

  /**
   * Get a database contribution by type.
   */
  getDatabase(type: string): DatabaseContribution | undefined {
    return this.databases.get(type)
  }

  /**
   * Create an extension context with the extension ID scoped.
   */
  private createContext(extensionId: string): ExtensionContextAPI {
    const disposables: { dispose(): void }[] = []

    return {
      registerCommand(id, _handler, _descriptor) {
        const fullId = `${extensionId}.${id}`
        console.debug(`[ExtensionHost] ${extensionId} registering command: ${fullId}`)
        // Will be connected to CommandRegistry in integration step
      },

      registerView(id, descriptor) {
        const fullId = `${extensionId}.${id}`
        console.debug(`[ExtensionHost] ${extensionId} registering view: ${fullId}`)
        ExtensionHost.views.set(fullId, { ...descriptor, id: fullId })
      },

      registerDatabase(descriptor) {
        console.debug(`[ExtensionHost] ${extensionId} registering database: ${descriptor.type}`)
        ExtensionHost.databases.set(descriptor.type, descriptor)
      },

      registerTheme(theme) {
        console.debug(`[ExtensionHost] ${extensionId} registering theme: ${theme.id}`)
      },

      subscriptions: disposables,

      dispose() {
        disposables.forEach((d) => {
          try { d.dispose() } catch (e) { console.error('[ExtensionHost] Dispose error:', e) }
        })
        disposables.length = 0
      },
    }
  }
}

export const ExtensionHost = new ExtensionHostImpl()
