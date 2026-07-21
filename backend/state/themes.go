// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// THEME MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// ThemeRow represents a theme stored in SQLite
type ThemeRow struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Colors    map[string]string `json:"colors"`
	IsBuiltin bool              `json:"isBuiltin"`
}

// SaveTheme upserts a theme definition
func (s *Service) SaveTheme(id, name, colorsJSON string, isBuiltin bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Info("SaveTheme: id=%s name=%s builtin=%v colors_len=%d", id, name, isBuiltin, len(colorsJSON))
	builtin := 0
	if isBuiltin {
		builtin = 1
	}
	_, err := s.db.Exec(`
		INSERT INTO themes (id, name, colors, is_builtin) VALUES (?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET name=excluded.name, colors=excluded.colors, updated=strftime('%s','now')
	`, id, name, colorsJSON, builtin)
	if err != nil {
		log.Error("SaveTheme failed for %s: %v", id, err)
	}
	return err
}

// DeleteTheme removes a non-builtin theme by ID
func (s *Service) DeleteTheme(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Info("DeleteTheme: id=%s", id)
	_, err := s.db.Exec("DELETE FROM themes WHERE id = ? AND is_builtin = 0", id)
	if err != nil {
		log.Error("DeleteTheme failed for %s: %v", id, err)
	}
	return err
}

// LoadThemes retrieves all themes as JSON array
func (s *Service) LoadThemes() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rows, err := s.db.Query("SELECT id, name, colors, is_builtin FROM themes ORDER BY is_builtin DESC, name ASC")
	if err != nil {
		return "[]", err
	}
	defer rows.Close()

	var themes []ThemeRow
	for rows.Next() {
		var t ThemeRow
		var colorsStr string
		var builtin int
		if err := rows.Scan(&t.ID, &t.Name, &colorsStr, &builtin); err == nil {
			_ = json.Unmarshal([]byte(colorsStr), &t.Colors)
			t.IsBuiltin = builtin == 1
			themes = append(themes, t)
		}
	}
	if themes == nil {
		log.Debug("LoadThemes: no themes found")
		return "[]", nil
	}
	b, err := json.Marshal(themes)
	if err != nil {
		log.Error("LoadThemes: marshal failed: %v", err)
		return "[]", err
	}
	log.Debug("LoadThemes: loaded %d themes", len(themes))
	return string(b), nil
}
