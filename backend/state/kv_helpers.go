// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import (
	"database/sql"
	"strings"

	"clientdb/backend/security"
)

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC TABLE HELPERS (for key-value tables)
// ══════════════════════════════════════════════════════════════════════════════

// sensitiveKeyPatterns are substrings that, if present in a KV key (case-insensitive),
// trigger encryption of the associated value. Patterns are chosen to be specific
// enough to avoid false positives (e.g. "keyword" in color overrides).
var sensitiveKeyPatterns = []string{
	"password",
	"passwd",
	"token",
	"secret",
	"apikey",
	"api_key",
	"encryption_key",
	"master_key",
	"private_key",
	"access_key",
	"credential",
}

func (s *Service) setKV(table, key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stored := value
	if isSensitiveKey(key) && s.encKey != nil {
		encrypted, err := security.EncryptString(value, s.encKey)
		if err != nil {
			log.Warn("setKV(%s, %s): encryption failed, storing plaintext: %v", table, key, err)
		} else {
			stored = encrypted
		}
	}

	_, err := s.db.Exec(
		"INSERT INTO "+table+" (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
		key, stored,
	)
	if err != nil {
		log.Error("setKV(%s, %s) failed: %v", table, key, err)
	} else {
		log.Debug("setKV(%s, %s) OK (%d bytes)", table, key, len(value))
	}
	return err
}

func (s *Service) getKV(table, key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var value string
	err := s.db.QueryRow("SELECT value FROM "+table+" WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		log.Debug("getKV(%s, %s) = not found", table, key)
		return "", nil
	}
	if err != nil {
		log.Error("getKV(%s, %s) failed: %v", table, key, err)
		return "", err
	}

	// Transparently decrypt if the value has the encrypted prefix.
	if security.IsEncrypted(value) && s.encKey != nil {
		decrypted, decErr := security.DecryptString(value, s.encKey)
		if decErr != nil {
			log.Warn("getKV(%s, %s): decryption failed, returning raw: %v", table, key, decErr)
			return value, nil
		}
		return decrypted, nil
	}

	return value, nil
}

func (s *Service) deleteKV(table, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec("DELETE FROM "+table+" WHERE key = ?", key)
	if err != nil {
		log.Error("deleteKV(%s, %s) failed: %v", table, key, err)
	} else {
		log.Debug("deleteKV(%s, %s) OK", table, key)
	}
	return err
}

func (s *Service) loadAllKV(table string) (map[string]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rows, err := s.db.Query("SELECT key, value FROM " + table)
	if err != nil {
		log.Error("loadAllKV(%s) query failed: %v", table, err)
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			log.Warn("loadAllKV(%s) scan error: %v", table, err)
			continue
		}
		// Transparently decrypt encrypted values.
		if security.IsEncrypted(v) && s.encKey != nil {
			decrypted, decErr := security.DecryptString(v, s.encKey)
			if decErr != nil {
				log.Warn("loadAllKV(%s): decrypt %s failed: %v", table, k, decErr)
				result[k] = v
			} else {
				result[k] = decrypted
			}
		} else {
			result[k] = v
		}
	}
	log.Debug("loadAllKV(%s): %d entries", table, len(result))
	return result, nil
}

// isSensitiveKey returns true if the key contains any of the sensitive patterns.
func isSensitiveKey(key string) bool {
	lower := strings.ToLower(key)
	for _, pattern := range sensitiveKeyPatterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	return false
}
