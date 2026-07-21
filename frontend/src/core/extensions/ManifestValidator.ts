/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionManifest } from './types'

/**
 * Validates extension manifests for correctness.
 */
export class ManifestValidator {
  private static ID_PATTERN = /^[a-z0-9][a-z0-9-_.]*$/
  private static VERSION_PATTERN = /^\d+\.\d+\.\d+/

  static validate(manifest: ExtensionManifest): string[] {
    const errors: string[] = []

    if (!manifest.id) errors.push('Missing required field: id')
    else if (!this.ID_PATTERN.test(manifest.id)) errors.push(`Invalid id format: "${manifest.id}" (use lowercase alphanumeric + hyphens)`)

    if (!manifest.name) errors.push('Missing required field: name')
    if (!manifest.version) errors.push('Missing required field: version')
    else if (!this.VERSION_PATTERN.test(manifest.version)) errors.push(`Invalid version format: "${manifest.version}" (use semver)`)

    if (!manifest.activationEvents || manifest.activationEvents.length === 0) {
      errors.push('Missing or empty activationEvents')
    }

    if (!manifest.contributes) {
      errors.push('Missing required field: contributes')
    }

    return errors
  }
}
