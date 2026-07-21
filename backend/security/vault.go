// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package security

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"golang.org/x/crypto/nacl/secretbox"
)

// ══════════════════════════════════════════════════════════════════════════════
// VAULT — encrypted credential storage with OS keychain integration
// ══════════════════════════════════════════════════════════════════════════════

const (
	vaultDir      = ".clientdb"
	vaultFileName = "vault.enc"
	keychainService = "clientdb"
	keychainAccount = "vault-encryption-key"
)

// vaultEntry is a single secret stored in the vault file.
type vaultEntry struct {
	Value string `json:"value"`
}

// vaultFile is the on-disk encrypted vault structure.
type vaultFile struct {
	Entries map[string]string `json:"entries"`
}

// Vault provides encrypted credential storage. On macOS it delegates to the
// OS keychain. On other platforms it falls back to file-based encryption using
// NaCl secretbox with the master key stored in the OS keychain when available.
type Vault struct {
	mu       sync.RWMutex
	filePath string
	key      [32]byte
}

// NewVault creates or opens the credential vault. The encryption key is
// retrieved from the OS keychain; if none exists a new one is generated and
// stored.
func NewVault() (*Vault, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("vault: cannot determine home directory: %w", err)
	}
	dir := filepath.Join(home, vaultDir)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("vault: cannot create vault directory: %w", err)
	}

	v := &Vault{
		filePath: filepath.Join(dir, vaultFileName),
	}

	key, err := getOrCreateMasterKey()
	if err != nil {
		return nil, fmt.Errorf("vault: cannot obtain master key: %w", err)
	}
	copy(v.key[:], key)

	return v, nil
}

// getOrCreateMasterKey retrieves the encryption key from the OS keychain.
// If no key exists a new random 32-byte key is generated and stored.
func getOrCreateMasterKey() ([]byte, error) {
	raw, err := retrieveKeyFromKeychain()
	if err == nil && len(raw) == 32 {
		return raw, nil
	}

	// Generate a new key
	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, fmt.Errorf("vault: cannot generate random key: %w", err)
	}

	if err := storeKeyInKeychain(key); err != nil {
		return nil, fmt.Errorf("vault: cannot store master key in keychain: %w", err)
	}
	return key, nil
}

// StoreSecret encrypts and stores a secret under the given key.
func (v *Vault) StoreSecret(key, value string) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	entries, err := v.loadEntries()
	if err != nil {
		return err
	}
	entries[key] = value
	return v.saveEntries(entries)
}

// RetrieveSecret decrypts and returns the secret for the given key.
func (v *Vault) RetrieveSecret(key string) (string, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()

	entries, err := v.loadEntries()
	if err != nil {
		return "", err
	}
	val, ok := entries[key]
	if !ok {
		return "", fmt.Errorf("vault: secret %q not found", key)
	}
	return val, nil
}

// DeleteSecret removes a secret from the vault.
func (v *Vault) DeleteSecret(key string) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	entries, err := v.loadEntries()
	if err != nil {
		return err
	}
	if _, ok := entries[key]; !ok {
		return fmt.Errorf("vault: secret %q not found", key)
	}
	delete(entries, key)
	return v.saveEntries(entries)
}

// ListSecrets returns the names of all stored secrets (values are not returned).
func (v *Vault) ListSecrets() ([]string, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()

	entries, err := v.loadEntries()
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0, len(entries))
	for k := range entries {
		keys = append(keys, k)
	}
	return keys, nil
}

// ── encrypted file I/O ───────────────────────────────────────────────────────

// loadEntries reads and decrypts the vault file. Returns an empty map if the
// file does not exist yet.
func (v *Vault) loadEntries() (map[string]string, error) {
	data, err := os.ReadFile(v.filePath)
	if os.IsNotExist(err) {
		return make(map[string]string), nil
	}
	if err != nil {
		return nil, fmt.Errorf("vault: cannot read vault file: %w", err)
	}

	plaintext, err := decrypt(data, v.key)
	if err != nil {
		return nil, fmt.Errorf("vault: cannot decrypt vault file: %w", err)
	}

	var vf vaultFile
	if err := json.Unmarshal(plaintext, &vf.Entries); err != nil {
		return nil, fmt.Errorf("vault: cannot parse vault file: %w", err)
	}
	if vf.Entries == nil {
		vf.Entries = make(map[string]string)
	}
	return vf.Entries, nil
}

// saveEntries encrypts and writes the vault file.
func (v *Vault) saveEntries(entries map[string]string) error {
	plaintext, err := json.Marshal(entries)
	if err != nil {
		return fmt.Errorf("vault: cannot serialize entries: %w", err)
	}

	ciphertext := encrypt(plaintext, v.key)
	if err := os.WriteFile(v.filePath, ciphertext, 0600); err != nil {
		return fmt.Errorf("vault: cannot write vault file: %w", err)
	}
	return nil
}

// ── NaCl secretbox helpers ────────────────────────────────────────────────────

// encrypt encrypts plaintext using NaCl secretbox with a random nonce prepended
// to the ciphertext.
func encrypt(plaintext []byte, key [32]byte) []byte {
	var nonce [24]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		panic("vault: cannot generate nonce: " + err.Error())
	}
	// nonce || sealed box
	return secretbox.Seal(nonce[:], plaintext, &nonce, &key)
}

// decrypt decrypts ciphertext produced by encrypt.
func decrypt(ciphertext []byte, key [32]byte) ([]byte, error) {
	if len(ciphertext) < 24 {
		return nil, fmt.Errorf("vault: ciphertext too short")
	}
	var nonce [24]byte
	copy(nonce[:], ciphertext[:24])
	plaintext, ok := secretbox.Open(nil, ciphertext[24:], &nonce, &key)
	if !ok {
		return nil, fmt.Errorf("vault: decryption failed (bad key or corrupted data)")
	}
	return plaintext, nil
}
