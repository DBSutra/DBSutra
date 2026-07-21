// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package security

import (
	"bytes"
	"encoding/base64"
	"strings"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// CRYPTO TESTS — AES-256-GCM encryption
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. GenerateKey ─────────────────────────────────────────────────────────

func TestGenerateKey_ReturnsCorrectLength(t *testing.T) {
	key, err := GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error: %v", err)
	}
	if len(key) != 32 {
		t.Errorf("GenerateKey() returned %d bytes, want 32", len(key))
	}
}

func TestGenerateKey_Unique(t *testing.T) {
	key1, _ := GenerateKey()
	key2, _ := GenerateKey()
	if bytes.Equal(key1, key2) {
		t.Error("GenerateKey() returned identical keys on two calls")
	}
}

// ── 2. Encrypt / Decrypt roundtrip ────────────────────────────────────────

func TestEncryptDecrypt_Roundtrip(t *testing.T) {
	key, err := GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error: %v", err)
	}

	plaintext := []byte("hello, world! this is a secret password")
	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt() error: %v", err)
	}

	decrypted, err := Decrypt(ciphertext, key)
	if err != nil {
		t.Fatalf("Decrypt() error: %v", err)
	}

	if !bytes.Equal(plaintext, decrypted) {
		t.Errorf("roundtrip failed: got %q, want %q", decrypted, plaintext)
	}
}

func TestEncryptDecrypt_EmptyPlaintext(t *testing.T) {
	key, err := GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error: %v", err)
	}

	ciphertext, err := Encrypt([]byte{}, key)
	if err != nil {
		t.Fatalf("Encrypt(empty) error: %v", err)
	}

	decrypted, err := Decrypt(ciphertext, key)
	if err != nil {
		t.Fatalf("Decrypt(empty) error: %v", err)
	}

	if len(decrypted) != 0 {
		t.Errorf("empty plaintext roundtrip: got %d bytes, want 0", len(decrypted))
	}
}

func TestEncryptDecrypt_LargeData(t *testing.T) {
	key, err := GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error: %v", err)
	}

	// 1 MB of data
	plaintext := bytes.Repeat([]byte("A"), 1024*1024)
	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt(1MB) error: %v", err)
	}

	decrypted, err := Decrypt(ciphertext, key)
	if err != nil {
		t.Fatalf("Decrypt(1MB) error: %v", err)
	}

	if !bytes.Equal(plaintext, decrypted) {
		t.Error("large data roundtrip failed")
	}
}

// ── 3. Tampered ciphertext ────────────────────────────────────────────────

func TestDecrypt_TamperedCiphertext(t *testing.T) {
	key, err := GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error: %v", err)
	}

	ciphertext, err := Encrypt([]byte("secret"), key)
	if err != nil {
		t.Fatalf("Encrypt() error: %v", err)
	}

	// Tamper with the last byte (the GCM authentication tag).
	ciphertext[len(ciphertext)-1] ^= 0xFF

	_, err = Decrypt(ciphertext, key)
	if err == nil {
		t.Error("Decrypt(tampered) should have returned an error")
	}
}

func TestDecrypt_WrongKey(t *testing.T) {
	key1, _ := GenerateKey()
	key2, _ := GenerateKey()

	ciphertext, err := Encrypt([]byte("secret"), key1)
	if err != nil {
		t.Fatalf("Encrypt() error: %v", err)
	}

	_, err = Decrypt(ciphertext, key2)
	if err == nil {
		t.Error("Decrypt with wrong key should have returned an error")
	}
}

func TestDecrypt_TooShort(t *testing.T) {
	key, _ := GenerateKey()

	_, err := Decrypt([]byte("short"), key)
	if err == nil {
		t.Error("Decrypt(short ciphertext) should have returned an error")
	}
}

// ── 4. Different plaintexts produce different ciphertexts ──────────────────

func TestEncrypt_DifferentNonces(t *testing.T) {
	key, _ := GenerateKey()

	ct1, _ := Encrypt([]byte("same"), key)
	ct2, _ := Encrypt([]byte("same"), key)

	// The nonces should be different, so the ciphertexts should differ.
	if bytes.Equal(ct1, ct2) {
		t.Error("two encryptions of the same plaintext produced identical ciphertext (nonce reuse)")
	}
}

// ── 5. Ciphertext has nonce prepended ─────────────────────────────────────

func TestEncrypt_CiphertextFormat(t *testing.T) {
	key, _ := GenerateKey()

	plaintext := []byte("test data")
	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt() error: %v", err)
	}

	// Ciphertext = 12 (nonce) + len(plaintext) + 16 (GCM tag)
	expectedLen := 12 + len(plaintext) + 16
	if len(ciphertext) != expectedLen {
		t.Errorf("ciphertext length = %d, want %d (12 nonce + %d plaintext + 16 tag)",
			len(ciphertext), expectedLen, len(plaintext))
	}
}

// ── 6. EncryptString / DecryptString ──────────────────────────────────────

func TestEncryptString_Roundtrip(t *testing.T) {
	key, _ := GenerateKey()

	plaintext := "my-super-secret-password"
	encrypted, err := EncryptString(plaintext, key)
	if err != nil {
		t.Fatalf("EncryptString() error: %v", err)
	}

	// Should have the enc:v1: prefix.
	if !strings.HasPrefix(encrypted, EncryptedPrefix) {
		t.Errorf("EncryptString() result %q missing prefix %q", encrypted, EncryptedPrefix)
	}

	// Should be valid base64 after the prefix.
	b64 := encrypted[len(EncryptedPrefix):]
	_, err = base64.StdEncoding.DecodeString(b64)
	if err != nil {
		t.Errorf("EncryptString() base64 portion is invalid: %v", err)
	}

	decrypted, err := DecryptString(encrypted, key)
	if err != nil {
		t.Fatalf("DecryptString() error: %v", err)
	}
	if decrypted != plaintext {
		t.Errorf("EncryptString/DecryptString roundtrip: got %q, want %q", decrypted, plaintext)
	}
}

func TestDecryptString_Passthrough(t *testing.T) {
	key, _ := GenerateKey()

	// A value without the enc:v1: prefix should be returned as-is.
	plain := "not-encrypted"
	result, err := DecryptString(plain, key)
	if err != nil {
		t.Fatalf("DecryptString(passthrough) error: %v", err)
	}
	if result != plain {
		t.Errorf("DecryptString(passthrough) = %q, want %q", result, plain)
	}
}

func TestDecryptString_EmptyPassthrough(t *testing.T) {
	key, _ := GenerateKey()

	result, err := DecryptString("", key)
	if err != nil {
		t.Fatalf("DecryptString(empty) error: %v", err)
	}
	if result != "" {
		t.Errorf("DecryptString(empty) = %q, want empty", result)
	}
}

// ── 7. IsEncrypted ────────────────────────────────────────────────────────

func TestIsEncrypted(t *testing.T) {
	tests := []struct {
		value string
		want  bool
	}{
		{"enc:v1:abc123", true},
		{"enc:v1:", false}, // prefix only, no actual content after prefix
		{"enc:v2:abc", false},
		{"plaintext", false},
		{"", false},
		{"password123", false},
	}

	for _, tt := range tests {
		got := IsEncrypted(tt.value)
		if got != tt.want {
			t.Errorf("IsEncrypted(%q) = %v, want %v", tt.value, got, tt.want)
		}
	}
}
