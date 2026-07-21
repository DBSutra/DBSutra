/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionManifest } from '@core/types'

const REQUIRED_FIELDS = ['id', 'name', 'version', 'activationEvents', 'contributes'] as const

export class ManifestValidator {
  static validate(manifest: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!manifest || typeof manifest !== 'object') {
      return { valid: false, errors: ['Manifest must be an object'] }
    }

    const m = manifest as Record<string, unknown>

    for (const field of REQUIRED_FIELDS) {
      if (!(field in m)) {
        errors.push(`Missing required field: "${field}"`)
      }
    }

    if (m.id && !/^[a-z0-9-_]+$/.test(String(m.id))) {
      errors.push('id must contain only lowercase letters, numbers, hyphens, or underscores')
    }

    if (m.version && !/^\d+\.\d+\.\d+$/.test(String(m.version))) {
      errors.push('version must be semver (e.g. 1.0.0)')
    }

    if (m.activationEvents && !Array.isArray(m.activationEvents)) {
      errors.push('activationEvents must be an array')
    }

    return { valid: errors.length === 0, errors }
  }

  static cast(manifest: unknown): ExtensionManifest {
    return manifest as ExtensionManifest
  }
}
