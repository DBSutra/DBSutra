// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// COLOR OVERRIDES
// ══════════════════════════════════════════════════════════════════════════════

// SaveColorOverride upserts a color override
func (s *Service) SaveColorOverride(token, value string) error {
	log.Debug("SaveColorOverride: %s = %s", token, value)
	return s.setKV("color_overrides", token, value)
}

// DeleteColorOverride removes a color override (revert to theme default)
func (s *Service) DeleteColorOverride(token string) error {
	log.Debug("DeleteColorOverride: %s", token)
	return s.deleteKV("color_overrides", token)
}

// LoadAllColorOverrides retrieves all color overrides as JSON
func (s *Service) LoadAllColorOverrides() (string, error) {
	data, err := s.loadAllKV("color_overrides")
	if err != nil {
		return "{}", err
	}
	b, err := json.Marshal(data)
	if err != nil {
		return "{}", err
	}
	return string(b), nil
}

// SeedColorOverrides inserts color overrides only if they don't already exist.
func (s *Service) SeedColorOverrides(defaultsJSON string) error {
	log.Debug("SeedColorOverrides: %d bytes", len(defaultsJSON))
	var defaults map[string]string
	if err := json.Unmarshal([]byte(defaultsJSON), &defaults); err != nil {
		log.Error("SeedColorOverrides: JSON parse failed: %v", err)
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	stmt, err := s.db.Prepare("INSERT OR IGNORE INTO color_overrides (key, value) VALUES (?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()
	for key, value := range defaults {
		if _, err := stmt.Exec(key, value); err != nil {
			log.Warn("SeedColorOverrides: insert failed for %s: %v", key, err)
		}
	}
	log.Debug("SeedColorOverrides: seeded %d overrides", len(defaults))
	return nil
}

// ReplaceColorOverrides atomically replaces ALL color overrides (used when switching themes).
func (s *Service) ReplaceColorOverrides(colorsJSON string) error {
	log.Info("ReplaceColorOverrides: replacing all overrides (%d bytes)", len(colorsJSON))
	var colors map[string]string
	if err := json.Unmarshal([]byte(colorsJSON), &colors); err != nil {
		log.Error("ReplaceColorOverrides: JSON parse failed: %v", err)
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM color_overrides"); err != nil {
		return err
	}
	stmt, err := tx.Prepare("INSERT INTO color_overrides (key, value) VALUES (?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()
	for key, value := range colors {
		if _, err := stmt.Exec(key, value); err != nil {
			log.Error("ReplaceColorOverrides: insert failed for %s: %v", key, err)
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		log.Error("ReplaceColorOverrides: commit failed: %v", err)
		return err
	}
	log.Info("ReplaceColorOverrides: replaced %d overrides", len(colors))
	return nil
}
