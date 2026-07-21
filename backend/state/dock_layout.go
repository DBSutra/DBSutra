// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "database/sql"

// ══════════════════════════════════════════════════════════════════════════════
// DOCK LAYOUT
// ══════════════════════════════════════════════════════════════════════════════

// SaveDockLayout persists the dock layout JSON
func (s *Service) SaveDockLayout(payload string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Debug("SaveDockLayout: %d bytes", len(payload))
	_, err := s.db.Exec(
		`INSERT INTO dock_layout (id, payload) VALUES ('current', ?)
		 ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated = strftime('%s','now')`,
		payload,
	)
	if err != nil {
		log.Error("SaveDockLayout failed: %v", err)
	}
	return err
}

// LoadDockLayout retrieves the saved dock layout JSON
func (s *Service) LoadDockLayout() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var payload string
	err := s.db.QueryRow("SELECT payload FROM dock_layout WHERE id = 'current'").Scan(&payload)
	if err == sql.ErrNoRows {
		log.Debug("LoadDockLayout: no layout found")
		return "", nil
	}
	if err != nil {
		log.Error("LoadDockLayout failed: %v", err)
	} else {
		log.Debug("LoadDockLayout: loaded %d bytes", len(payload))
	}
	return payload, err
}

// SaveLayout persists the dock layout JSON (legacy wrapper)
func (s *Service) SaveLayout(layoutJSON string) error {
	return s.SaveDockLayout(layoutJSON)
}

// LoadLayout retrieves the saved dock layout JSON (legacy wrapper)
func (s *Service) LoadLayout() (string, error) {
	return s.LoadDockLayout()
}
