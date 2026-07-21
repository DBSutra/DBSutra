// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build windows

package security

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// ══════════════════════════════════════════════════════════════════════════════
// VAULT — Windows implementation (Credential Manager + file fallback)
// ══════════════════════════════════════════════════════════════════════════════
//
// On Windows the master key is stored via the Windows Credential Manager using
// the `cmdkey` command. If that is unavailable (e.g. in a headless CI
// environment) we fall back to file-based storage with restricted ACLs.
//
// Credential Manager commands used:
//   cmdkey /generic:clientdb /user:vault-key /pass:<key-hex>
//   cmdkey /generic:clientdb /user:vault-key
//   cmdkey /delete:clientdb

const credTarget = "clientdb"
const credUser = "vault-key"

// hexEncode converts bytes to a hex string for storage.
func hexEncode(b []byte) string {
	const hex = "0123456789abcdef"
	buf := make([]byte, len(b)*2)
	for i, v := range b {
		buf[i*2] = hex[v>>4]
		buf[i*2+1] = hex[v&0x0f]
	}
	return string(buf)
}

// hexDecode converts a hex string back to bytes.
func hexDecode(s string) ([]byte, error) {
	if len(s)%2 != 0 {
		return nil, fmt.Errorf("vault: invalid hex string length")
	}
	b := make([]byte, len(s)/2)
	for i := 0; i < len(s); i += 2 {
		var hi, lo byte
		for j, c := range "0123456789abcdef" {
			if s[i] == byte(c) {
				hi = byte(j)
			}
			if s[i+1] == byte(c) {
				lo = byte(j)
			}
		}
		b[i/2] = (hi << 4) | lo
	}
	return b, nil
}

// storeKeyInKeychain stores the vault master key in Windows Credential Manager.
func storeKeyInKeychain(key []byte) error {
	hexKey := hexEncode(key)
	cmd := exec.Command("cmdkey",
		fmt.Sprintf("/generic:%s", credTarget),
		fmt.Sprintf("/user:%s", credUser),
		fmt.Sprintf("/pass:%s", hexKey),
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		// Fallback to file-based storage.
		return storeKeyToFile(key)
	}
	return nil
}

// retrieveKeyFromKeychain retrieves the vault master key from Windows Credential
// Manager.
func retrieveKeyFromKeychain() ([]byte, error) {
	// cmdkey doesn't have a direct "read password" command. We use a PowerShell
	// one-liner to read the credential.
	psScript := fmt.Sprintf(
		`[System.Text.Encoding]::UTF8.GetString((Get-StoredCredential -Target '%s' -Type Generic).Password)`,
		credTarget,
	)
	cmd := exec.Command("powershell", "-NoProfile", "-Command", psScript)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		// Fallback to file-based storage.
		return retrieveKeyFromFile()
	}
	raw := strings.TrimSpace(stdout.String())
	if raw == "" {
		return nil, fmt.Errorf("vault: empty key from credential manager")
	}
	return hexDecode(raw)
}

// deleteKeyFromKeychain removes the vault master key from Windows Credential
// Manager.
func deleteKeyFromKeychain() error {
	cmd := exec.Command("cmdkey", fmt.Sprintf("/delete:%s", credTarget))
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("vault: cmdkey delete failed: %s: %w", strings.TrimSpace(stderr.String()), err)
	}
	return nil
}

// ── file-based fallback ──────────────────────────────────────────────────────

func storeKeyToFile(key []byte) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("vault: cannot determine home directory: %w", err)
	}
	dir := fmt.Sprintf("%s\\.clientdb", home)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("vault: cannot create vault directory: %w", err)
	}
	path := fmt.Sprintf("%s\\.master-key", dir)
	if err := os.WriteFile(path, key, 0600); err != nil {
		return fmt.Errorf("vault: cannot write master key file: %w", err)
	}
	return nil
}

func retrieveKeyFromFile() ([]byte, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("vault: cannot determine home directory: %w", err)
	}
	path := fmt.Sprintf("%s\\.clientdb\\.master-key", home)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("vault: cannot read master key file: %w", err)
	}
	if len(data) != 32 {
		return nil, fmt.Errorf("vault: master key has unexpected length %d (want 32)", len(data))
	}
	return data, nil
}
