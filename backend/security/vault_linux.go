// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build linux

package security

import (
	"fmt"
	"os"
)

// ══════════════════════════════════════════════════════════════════════════════
// VAULT — Linux implementation (file-based encryption fallback)
// ══════════════════════════════════════════════════════════════════════════════
//
// On Linux the preferred approach would be to use the Secret Service API
// (org.freedesktop.secrets via D-Bus) which integrates with GNOME Keyring
// or KWallet. This implementation falls back to file-based encryption when
// the Secret Service is not available.
//
// The master encryption key is stored in ~/.clientdb/.master-key with mode
// 0600. All credential data is encrypted with NaCl secretbox and stored in
// ~/.clientdb/vault.enc.

const masterKeyFile = ".master-key"

// storeKeyInKeychain stores the master encryption key to a file with restricted
// permissions. On a Linux system with Secret Service available this would
// delegate to the D-Bus API; for now we use a local file.
func storeKeyInKeychain(key []byte) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("vault: cannot determine home directory: %w", err)
	}
	dir := fmt.Sprintf("%s/.clientdb", home)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("vault: cannot create vault directory: %w", err)
	}
	path := fmt.Sprintf("%s/%s", dir, masterKeyFile)
	if err := os.WriteFile(path, key, 0600); err != nil {
		return fmt.Errorf("vault: cannot write master key: %w", err)
	}
	return nil
}

// retrieveKeyFromKeychain reads the master encryption key from the local file.
func retrieveKeyFromKeychain() ([]byte, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("vault: cannot determine home directory: %w", err)
	}
	path := fmt.Sprintf("%s/.clientdb/%s", home, masterKeyFile)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("vault: cannot read master key: %w", err)
	}
	if len(data) != 32 {
		return nil, fmt.Errorf("vault: master key has unexpected length %d (want 32)", len(data))
	}
	return data, nil
}

// deleteKeyFromKeychain removes the master key file.
func deleteKeyFromKeychain() error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	path := fmt.Sprintf("%s/.clientdb/%s", home, masterKeyFile)
	return os.Remove(path)
}
