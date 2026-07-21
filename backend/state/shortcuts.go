// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════════════════════

// SaveShortcut upserts a keyboard shortcut
func (s *Service) SaveShortcut(commandId, keybinding string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Debug("SaveShortcut: cmd=%s key=%s", commandId, keybinding)
	_, err := s.db.Exec(
		`INSERT INTO shortcuts (command_id, keybinding) VALUES (?, ?)
		 ON CONFLICT(command_id) DO UPDATE SET keybinding = excluded.keybinding`,
		commandId, keybinding,
	)
	if err != nil {
		log.Error("SaveShortcut failed for %s: %v", commandId, err)
	}
	return err
}

// LoadAllShortcuts retrieves all shortcuts as JSON
func (s *Service) LoadAllShortcuts() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rows, err := s.db.Query("SELECT command_id, keybinding FROM shortcuts WHERE enabled = 1")
	if err != nil {
		return "{}", err
	}
	defer rows.Close()

	result := make(map[string]string)
	for rows.Next() {
		var cmd, kb string
		if err := rows.Scan(&cmd, &kb); err != nil {
			continue
		}
		result[cmd] = kb
	}
	b, err := json.Marshal(result)
	if err != nil {
		return "{}", err
	}
	return string(b), nil
}
