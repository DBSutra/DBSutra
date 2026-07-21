// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import (
	"encoding/json"
	"fmt"

	"clientdb/backend/security"
)

// ══════════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTIONS
// ══════════════════════════════════════════════════════════════════════════════

// sensitiveJSONPaths lists the JSON paths whose values should be encrypted.
// These are checked as top-level keys and one level of nesting (e.g. ssh.password).
var sensitiveJSONPaths = []string{"password", "token", "secret", "apiKey", "accessKey"}

// sensitiveNestedPaths lists parent keys whose child keys should be checked
// for sensitive fields.
var sensitiveNestedKeys = []string{"ssh", "ssl", "tls"}

// SaveConnection upserts a connection config. Password and other sensitive
// fields in the config JSON are encrypted before storage.
func (s *Service) SaveConnection(id, name, connType, configJSON string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	encrypted, err := s.encryptConnectionConfig(configJSON)
	if err != nil {
		log.Warn("SaveConnection: encryption failed for %s, storing plaintext: %v", id, err)
		encrypted = configJSON
	}

	log.Info("SaveConnection: id=%s name=%s type=%s config_len=%d", id, name, connType, len(configJSON))
	_, err = s.db.Exec(`
		INSERT INTO connections (id, name, type, config)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, config=excluded.config, updated=strftime('%s','now')
	`, id, name, connType, encrypted)
	if err != nil {
		log.Error("SaveConnection failed for %s: %v", id, err)
	}
	return err
}

// LoadConnections retrieves all saved connections as JSON array. Encrypted
// password fields are transparently decrypted before returning.
func (s *Service) LoadConnections() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	log.Debug("LoadConnections: querying all connections")
	rows, err := s.db.Query("SELECT config FROM connections ORDER BY updated DESC")
	if err != nil {
		log.Error("LoadConnections query failed: %v", err)
		return "[]", err
	}
	defer rows.Close()

	var configs []json.RawMessage
	for rows.Next() {
		var cfg string
		if err := rows.Scan(&cfg); err != nil {
			log.Warn("LoadConnections: scan error: %v", err)
			continue
		}

		decrypted, err := s.decryptConnectionConfig(cfg)
		if err != nil {
			log.Warn("LoadConnections: decrypt failed, returning as-is: %v", err)
			configs = append(configs, json.RawMessage(cfg))
			continue
		}
		configs = append(configs, json.RawMessage(decrypted))
	}
	if configs == nil {
		log.Debug("LoadConnections: no connections found")
		return "[]", nil
	}
	data, err := json.Marshal(configs)
	if err != nil {
		log.Error("LoadConnections: marshal failed: %v", err)
		return "[]", err
	}
	log.Info("LoadConnections: loaded %d connections (%d bytes)", len(configs), len(data))
	return string(data), nil
}

// DeleteConnection removes a connection by ID
func (s *Service) DeleteConnection(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Info("DeleteConnection: id=%s", id)
	_, err := s.db.Exec("DELETE FROM connections WHERE id = ?", id)
	if err != nil {
		log.Error("DeleteConnection failed for %s: %v", id, err)
	}
	return err
}

// ── encryption helpers ──────────────────────────────────────────────────────

// encryptConnectionConfig encrypts sensitive fields in a connection config JSON.
// Returns the original string unchanged if no sensitive fields are present,
// preserving the original key order.
func (s *Service) encryptConnectionConfig(configJSON string) (string, error) {
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return configJSON, fmt.Errorf("encrypt: invalid JSON: %w", err)
	}

	if !hasSensitiveFields(config) {
		return configJSON, nil
	}

	if err := s.encryptSensitiveFields(config); err != nil {
		return configJSON, err
	}

	result, err := json.Marshal(config)
	if err != nil {
		return configJSON, fmt.Errorf("encrypt: marshal failed: %w", err)
	}
	return string(result), nil
}

// decryptConnectionConfig decrypts sensitive fields in a connection config JSON.
// Returns the original string unchanged if no encrypted fields are present,
// preserving the original key order.
func (s *Service) decryptConnectionConfig(configJSON string) (string, error) {
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return configJSON, fmt.Errorf("decrypt: invalid JSON: %w", err)
	}

	if !hasEncryptedFields(config) {
		return configJSON, nil
	}

	if err := s.decryptSensitiveFields(config); err != nil {
		return configJSON, err
	}

	result, err := json.Marshal(config)
	if err != nil {
		return configJSON, fmt.Errorf("decrypt: marshal failed: %w", err)
	}
	return string(result), nil
}

// hasSensitiveFields returns true if the config contains any field that should
// be encrypted (non-empty string values in sensitive paths).
func hasSensitiveFields(config map[string]interface{}) bool {
	for _, path := range sensitiveJSONPaths {
		if val, ok := config[path]; ok {
			if strVal, ok := val.(string); ok && strVal != "" && !security.IsEncrypted(strVal) {
				return true
			}
		}
	}
	for _, nested := range sensitiveNestedKeys {
		obj, ok := config[nested].(map[string]interface{})
		if !ok {
			continue
		}
		for _, path := range sensitiveJSONPaths {
			if val, ok := obj[path]; ok {
				if strVal, ok := val.(string); ok && strVal != "" && !security.IsEncrypted(strVal) {
					return true
				}
			}
		}
	}
	return false
}

// hasEncryptedFields returns true if the config contains any field with the
// enc:v1: prefix.
func hasEncryptedFields(config map[string]interface{}) bool {
	for _, path := range sensitiveJSONPaths {
		if val, ok := config[path]; ok {
			if strVal, ok := val.(string); ok && security.IsEncrypted(strVal) {
				return true
			}
		}
	}
	for _, nested := range sensitiveNestedKeys {
		obj, ok := config[nested].(map[string]interface{})
		if !ok {
			continue
		}
		for _, path := range sensitiveJSONPaths {
			if val, ok := obj[path]; ok {
				if strVal, ok := val.(string); ok && security.IsEncrypted(strVal) {
					return true
				}
			}
		}
	}
	return false
}

// encryptSensitiveFields walks the config map and encrypts any sensitive field values.
func (s *Service) encryptSensitiveFields(config map[string]interface{}) error {
	// Encrypt top-level sensitive fields.
	for _, path := range sensitiveJSONPaths {
		if val, ok := config[path]; ok {
			strVal, ok := val.(string)
			if !ok || strVal == "" || security.IsEncrypted(strVal) {
				continue
			}
			encrypted, err := security.EncryptString(strVal, s.encKey)
			if err != nil {
				return fmt.Errorf("encrypt field %q: %w", path, err)
			}
			config[path] = encrypted
		}
	}

	// Encrypt sensitive fields inside nested objects (e.g. ssh.password).
	for _, nested := range sensitiveNestedKeys {
		obj, ok := config[nested].(map[string]interface{})
		if !ok {
			continue
		}
		for _, path := range sensitiveJSONPaths {
			if val, ok := obj[path]; ok {
				strVal, ok := val.(string)
				if !ok || strVal == "" || security.IsEncrypted(strVal) {
					continue
				}
				encrypted, err := security.EncryptString(strVal, s.encKey)
				if err != nil {
					return fmt.Errorf("encrypt %s.%s: %w", nested, path, err)
				}
				obj[path] = encrypted
			}
		}
	}

	return nil
}

// decryptSensitiveFields walks the config map and decrypts any encrypted field values.
func (s *Service) decryptSensitiveFields(config map[string]interface{}) error {
	// Decrypt top-level sensitive fields.
	for _, path := range sensitiveJSONPaths {
		if val, ok := config[path]; ok {
			strVal, ok := val.(string)
			if !ok || !security.IsEncrypted(strVal) {
				continue
			}
			decrypted, err := security.DecryptString(strVal, s.encKey)
			if err != nil {
				return fmt.Errorf("decrypt field %q: %w", path, err)
			}
			config[path] = decrypted
		}
	}

	// Decrypt sensitive fields inside nested objects.
	for _, nested := range sensitiveNestedKeys {
		obj, ok := config[nested].(map[string]interface{})
		if !ok {
			continue
		}
		for _, path := range sensitiveJSONPaths {
			if val, ok := obj[path]; ok {
				strVal, ok := val.(string)
				if !ok || !security.IsEncrypted(strVal) {
					continue
				}
				decrypted, err := security.DecryptString(strVal, s.encKey)
				if err != nil {
					return fmt.Errorf("decrypt %s.%s: %w", nested, path, err)
				}
				obj[path] = decrypted
			}
		}
	}

	return nil
}
