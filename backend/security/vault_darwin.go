// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build darwin

package security

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"strings"
)

// ══════════════════════════════════════════════════════════════════════════════
// VAULT — macOS Keychain implementation
// ══════════════════════════════════════════════════════════════════════════════

// currentUser returns the OS username for keychain item attribution.
func currentUser() string {
	u, err := user.Current()
	if err != nil {
		return "dbsutra"
	}
	return u.Username
}

// storeKeyInKeychain stores the vault master encryption key in macOS Keychain.
func storeKeyInKeychain(key []byte) error {
	// Delete any existing key first (ignore error if it doesn't exist).
	_ = deleteKeyFromKeychain()

	account := currentUser()
	cmd := exec.Command(
		"/usr/bin/security",
		"add-generic-password",
		"-a", account,
		"-s", keychainService,
		"-w", string(key),
		"-U", // update if exists
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("keychain store failed: %s: %w", strings.TrimSpace(stderr.String()), err)
	}
	return nil
}

// retrieveKeyFromKeychain retrieves the vault master encryption key from macOS Keychain.
func retrieveKeyFromKeychain() ([]byte, error) {
	account := currentUser()
	cmd := exec.Command(
		"/usr/bin/security",
		"find-generic-password",
		"-a", account,
		"-s", keychainService,
		"-w", // output password only
	)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("keychain retrieve failed: %s: %w", strings.TrimSpace(stderr.String()), err)
	}
	raw := bytes.TrimRight(stdout.Bytes(), "\n\r")
	if len(raw) == 0 {
		return nil, fmt.Errorf("keychain returned empty key")
	}
	return raw, nil
}

// deleteKeyFromKeychain removes the vault master key from macOS Keychain.
func deleteKeyFromKeychain() error {
	account := currentUser()
	cmd := exec.Command(
		"/usr/bin/security",
		"delete-generic-password",
		"-a", account,
		"-s", keychainService,
	)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("keychain delete failed: %w", err)
	}
	return nil
}

// StoreSecretOS stores a secret directly in the macOS Keychain (bypassing the
// vault file). This is used for individual credential storage.
func StoreSecretInOSKeychain(key, value string) error {
	account := currentUser()
	cmd := exec.Command(
		"/usr/bin/security",
		"add-generic-password",
		"-a", account,
		"-s", fmt.Sprintf("%s-%s", keychainService, key),
		"-w", value,
		"-U",
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("keychain store failed for %q: %s: %w", key, strings.TrimSpace(stderr.String()), err)
	}
	return nil
}

// RetrieveSecretFromOS retrieves a secret directly from the macOS Keychain.
func RetrieveSecretFromOSKeychain(key string) (string, error) {
	account := currentUser()
	cmd := exec.Command(
		"/usr/bin/security",
		"find-generic-password",
		"-a", account,
		"-s", fmt.Sprintf("%s-%s", keychainService, key),
		"-w",
	)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("keychain retrieve failed for %q: %s: %w", key, strings.TrimSpace(stderr.String()), err)
	}
	return strings.TrimRight(stdout.String(), "\n\r"), nil
}

// DeleteSecretFromOS removes a secret from the macOS Keychain.
func DeleteSecretFromOSKeychain(key string) error {
	account := currentUser()
	cmd := exec.Command(
		"/usr/bin/security",
		"delete-generic-password",
		"-a", account,
		"-s", fmt.Sprintf("%s-%s", keychainService, key),
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("keychain delete failed for %q: %s: %w", key, strings.TrimSpace(stderr.String()), err)
	}
	return nil
}

// getVaultDir returns the path to the vault data directory. On macOS we also
// check that the directory has appropriate permissions (0700).
func getVaultDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := fmt.Sprintf("%s/.clientdb", home)
	info, err := os.Stat(dir)
	if err == nil {
		perm := info.Mode().Perm()
		if perm != 0700 {
			// Fix permissions if they are too open.
			if err := os.Chmod(dir, 0700); err != nil {
				return "", fmt.Errorf("vault: cannot fix permissions on %s: %w", dir, err)
			}
		}
	}
	return dir, nil
}
