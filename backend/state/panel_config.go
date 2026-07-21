// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// PANEL CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// SavePanelConfig upserts a panel config setting
func (s *Service) SavePanelConfig(key, value string) error {
	return s.setKV("panel_config", key, value)
}

// LoadAllPanelConfig retrieves all panel config settings as JSON
func (s *Service) LoadAllPanelConfig() (string, error) {
	data, err := s.loadAllKV("panel_config")
	if err != nil {
		return "{}", err
	}
	b, err := json.Marshal(data)
	if err != nil {
		return "{}", err
	}
	return string(b), nil
}
