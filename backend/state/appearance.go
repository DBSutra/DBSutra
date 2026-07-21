// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// APPEARANCE SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

// SaveAppearance upserts an appearance setting
func (s *Service) SaveAppearance(key, value string) error {
	return s.setKV("appearance", key, value)
}

// LoadAllAppearance retrieves all appearance settings as JSON
func (s *Service) LoadAllAppearance() (string, error) {
	data, err := s.loadAllKV("appearance")
	if err != nil {
		return "{}", err
	}
	b, err := json.Marshal(data)
	if err != nil {
		return "{}", err
	}
	return string(b), nil
}
