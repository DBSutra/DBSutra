// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// FONT CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// SaveFont upserts a font setting
func (s *Service) SaveFont(key, value string) error {
	return s.setKV("fonts", key, value)
}

// LoadAllFonts retrieves all font settings as JSON
func (s *Service) LoadAllFonts() (string, error) {
	data, err := s.loadAllKV("fonts")
	if err != nil {
		return "{}", err
	}
	b, err := json.Marshal(data)
	if err != nil {
		return "{}", err
	}
	return string(b), nil
}
