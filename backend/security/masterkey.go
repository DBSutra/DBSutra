// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package security

// ══════════════════════════════════════════════════════════════════════════════
// MASTER KEY MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
//
// GetOrCreateMasterKey retrieves the application's master encryption key from
// the OS keychain (macOS Keychain, Windows Credential Manager) or a local file
// (Linux). If no key exists, a new one is generated and stored.
//
// This master key is used to encrypt/decrypt connection passwords and other
// sensitive data in the state database.

// GetOrCreateMasterKey returns the 32-byte master encryption key. On first run
// a new key is generated and persisted via the platform-specific keychain.
//
// Platform storage:
//   - macOS: stored in the system Keychain via /usr/bin/security
//   - Linux: stored in ~/.clientdb/.masterkey with file permissions 0600
//   - Windows: stored in Windows Credential Manager (with file fallback)
func GetOrCreateMasterKey() ([]byte, error) {
	return getOrCreateMasterKey()
}

// GetMasterKeyForTest returns the master key suitable for testing.
// It uses the same underlying mechanism as GetOrCreateMasterKey.
// Exported for use by test packages that need to set up encryption.
func GetMasterKeyForTest() ([]byte, error) {
	return GenerateKey()
}
