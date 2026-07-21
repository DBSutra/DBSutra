// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

// ══════════════════════════════════════════════════════════════════════════════
// LEGACY KV STORE
// ══════════════════════════════════════════════════════════════════════════════

// Get retrieves a value from the KV store
func (s *Service) Get(key string) (string, error) {
	return s.getKV("kv_store", key)
}

// Set stores a value in the KV store
func (s *Service) Set(key string, value string) error {
	return s.setKV("kv_store", key, value)
}

// Delete removes a key from the KV store
func (s *Service) Delete(key string) error {
	return s.deleteKV("kv_store", key)
}

// SaveSettings persists settings JSON (legacy wrapper - stores in kv_store)
func (s *Service) SaveSettings(settingsJSON string) error {
	return s.Set("settings", settingsJSON)
}

// LoadSettings retrieves settings JSON (legacy wrapper)
func (s *Service) LoadSettings() (string, error) {
	return s.Get("settings")
}
