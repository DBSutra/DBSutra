// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// BULK CONFIG LOADER — single call for frontend bootstrap
// ══════════════════════════════════════════════════════════════════════════════

// AllConfig represents the full configuration state
type AllConfig struct {
	Appearance     map[string]string `json:"appearance"`
	Fonts          map[string]string `json:"fonts"`
	PanelConfig    map[string]string `json:"panelConfig"`
	DockLayout     string            `json:"dockLayout"`
	Shortcuts      map[string]string `json:"shortcuts"`
	ColorOverrides map[string]string `json:"colorOverrides"`
	Themes         []ThemeRow        `json:"themes"`
}

// LoadAllConfig loads all configuration tables in one call
func (s *Service) LoadAllConfig() (string, error) {
	log.Info("LoadAllConfig: loading all configuration tables...")

	appearance, _ := s.loadAllKV("appearance")
	fonts, _ := s.loadAllKV("fonts")
	panelConfig, _ := s.loadAllKV("panel_config")
	colorOverrides, _ := s.loadAllKV("color_overrides")

	// Shortcuts with enabled filter
	shortcuts := make(map[string]string)
	if rows, err := s.db.Query("SELECT command_id, keybinding FROM shortcuts WHERE enabled = 1"); err == nil {
		defer rows.Close()
		for rows.Next() {
			var cmd, kb string
			if err := rows.Scan(&cmd, &kb); err == nil {
				shortcuts[cmd] = kb
			}
		}
	} else {
		log.Warn("LoadAllConfig: shortcuts query failed: %v", err)
	}

	// Dock layout
	dockLayout := ""
	if err := s.db.QueryRow("SELECT payload FROM dock_layout WHERE id = 'current'").Scan(&dockLayout); err != nil {
		log.Debug("LoadAllConfig: no dock layout found: %v", err)
	}

	// Themes
	var themes []ThemeRow
	if rows, err := s.db.Query("SELECT id, name, colors, is_builtin FROM themes ORDER BY is_builtin DESC, name ASC"); err == nil {
		defer rows.Close()
		for rows.Next() {
			var t ThemeRow
			var colorsStr string
			var builtin int
			if err := rows.Scan(&t.ID, &t.Name, &colorsStr, &builtin); err == nil {
				if err := json.Unmarshal([]byte(colorsStr), &t.Colors); err != nil {
					log.Warn("LoadAllConfig: theme %s has invalid colors JSON: %v", t.ID, err)
				}
				t.IsBuiltin = builtin == 1
				themes = append(themes, t)
			}
		}
	} else {
		log.Warn("LoadAllConfig: themes query failed: %v", err)
	}

	// Ensure non-nil maps/slices
	if appearance == nil {
		appearance = make(map[string]string)
	}
	if fonts == nil {
		fonts = make(map[string]string)
	}
	if panelConfig == nil {
		panelConfig = make(map[string]string)
	}
	if colorOverrides == nil {
		colorOverrides = make(map[string]string)
	}
	if themes == nil {
		themes = []ThemeRow{}
	}

	config := AllConfig{
		Appearance:     appearance,
		Fonts:          fonts,
		PanelConfig:    panelConfig,
		DockLayout:     dockLayout,
		Shortcuts:      shortcuts,
		ColorOverrides: colorOverrides,
		Themes:         themes,
	}

	b, err := json.Marshal(config)
	if err != nil {
		log.Error("LoadAllConfig: marshal failed: %v", err)
		return "{}", err
	}
	log.Info("LoadAllConfig: loaded — appearance=%d fonts=%d panel=%d shortcuts=%d overrides=%d themes=%d dock=%d bytes",
		len(appearance), len(fonts), len(panelConfig), len(shortcuts), len(colorOverrides), len(themes), len(dockLayout))
	return string(b), nil
}
