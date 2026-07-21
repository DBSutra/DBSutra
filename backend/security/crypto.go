// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
)

// ══════════════════════════════════════════════════════════════════════════════
// CRYPTO — AES-256-GCM encryption utilities
// ══════════════════════════════════════════════════════════════════════════════

const (
	// aesKeySize is the required key size for AES-256 (32 bytes).
	aesKeySize = 32

	// gcmNonceSize is the standard nonce size for AES-GCM (12 bytes).
	gcmNonceSize = 12

	// EncryptedPrefix marks a value as encrypted with AES-256-GCM v1.
	// Stored values have the format: "enc:v1:" + base64(nonce + ciphertext + tag)
	EncryptedPrefix = "enc:v1:"
)

// GenerateKey generates a cryptographically secure 32-byte random key
// suitable for AES-256.
func GenerateKey() ([]byte, error) {
	key := make([]byte, aesKeySize)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, fmt.Errorf("crypto: failed to generate random key: %w", err)
	}
	return key, nil
}

// Encrypt encrypts plaintext using AES-256-GCM with the given 32-byte key.
// The returned ciphertext has the format: [12-byte nonce][ciphertext+tag].
func Encrypt(plaintext []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("crypto: failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("crypto: failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcmNonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("crypto: failed to generate nonce: %w", err)
	}

	// Seal appends the ciphertext+tag to nonce, producing: nonce || ciphertext || tag
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// Decrypt decrypts ciphertext produced by Encrypt.
// The ciphertext must have the format: [12-byte nonce][ciphertext+tag].
func Decrypt(ciphertext []byte, key []byte) ([]byte, error) {
	if len(ciphertext) < gcmNonceSize {
		return nil, fmt.Errorf("crypto: ciphertext too short (need at least %d bytes, got %d)", gcmNonceSize, len(ciphertext))
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("crypto: failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("crypto: failed to create GCM: %w", err)
	}

	nonce := ciphertext[:gcmNonceSize]
	encrypted := ciphertext[gcmNonceSize:]

	plaintext, err := gcm.Open(nil, nonce, encrypted, nil)
	if err != nil {
		return nil, fmt.Errorf("crypto: decryption failed (bad key or tampered data): %w", err)
	}

	return plaintext, nil
}

// EncryptString encrypts a plaintext string and returns an "enc:v1:" prefixed
// base64-encoded string suitable for storage.
func EncryptString(plaintext string, key []byte) (string, error) {
	ciphertext, err := Encrypt([]byte(plaintext), key)
	if err != nil {
		return "", err
	}
	return EncryptedPrefix + base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptString decrypts an "enc:v1:" prefixed base64-encoded string back to
// plaintext. If the value does not have the encrypted prefix, it is returned
// as-is (transparent pass-through for unencrypted values).
func DecryptString(value string, key []byte) (string, error) {
	if !IsEncrypted(value) {
		return value, nil
	}

	b64 := value[len(EncryptedPrefix):]
	ciphertext, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return "", fmt.Errorf("crypto: failed to decode base64: %w", err)
	}

	plaintext, err := Decrypt(ciphertext, key)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// IsEncrypted returns true if the value has the "enc:v1:" prefix, indicating
// it was encrypted by this package.
func IsEncrypted(value string) bool {
	return len(value) > len(EncryptedPrefix) && value[:len(EncryptedPrefix)] == EncryptedPrefix
}
