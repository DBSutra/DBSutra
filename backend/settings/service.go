// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package settings

import (
	"context"
	"encoding/json"

	"clientdb/backend/fs"
	clog "clientdb/backend/log"
)

var log = clog.New("settings")

const settingsFile = "settings.json"

// Service manages application settings persistence
type Service struct {
	ctx context.Context
	fs  *fs.Service
}

// NewService creates a new Settings service
func NewService(fsvc *fs.Service) *Service {
	log.Info("Settings service created")
	return &Service{fs: fsvc}
}

func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// LoadSettings loads settings from disk
func (s *Service) LoadSettings() (map[string]interface{}, error) {
	log.Debug("LoadSettings: checking for %s", settingsFile)
	if !s.fs.FileExists(settingsFile) {
		log.Info("LoadSettings: no settings file found — returning defaults")
		return map[string]interface{}{}, nil
	}
	content, err := s.fs.ReadFile(settingsFile)
	if err != nil {
		log.Error("LoadSettings: read failed: %v", err)
		return nil, err
	}
	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(content), &settings); err != nil {
		log.Error("LoadSettings: JSON parse failed (%d bytes): %v", len(content), err)
		return nil, err
	}
	log.Info("LoadSettings: loaded %d keys (%d bytes)", len(settings), len(content))
	return settings, nil
}

// SaveSettings writes settings to disk
func (s *Service) SaveSettings(settings map[string]interface{}) error {
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		log.Error("SaveSettings: JSON marshal failed: %v", err)
		return err
	}
	log.Debug("SaveSettings: writing %d keys (%d bytes)", len(settings), len(data))
	return s.fs.WriteFile(settingsFile, string(data))
}

// LoadLayout loads the persisted layout from disk
func (s *Service) LoadLayout() (string, error) {
	log.Debug("LoadLayout: checking for layout.json")
	if !s.fs.FileExists("layout.json") {
		log.Debug("LoadLayout: no layout file found")
		return "", nil
	}
	data, err := s.fs.ReadFile("layout.json")
	if err != nil {
		log.Error("LoadLayout: read failed: %v", err)
		return "", err
	}
	log.Debug("LoadLayout: loaded %d bytes", len(data))
	return data, nil
}

// SaveLayout persists the layout to disk
func (s *Service) SaveLayout(layoutJSON string) error {
	log.Debug("SaveLayout: writing %d bytes", len(layoutJSON))
	return s.fs.WriteFile("layout.json", layoutJSON)
}

// LoadConnections loads saved connection configs
func (s *Service) LoadConnections() (string, error) {
	log.Debug("LoadConnections: checking for connections.json")
	if !s.fs.FileExists("connections.json") {
		log.Info("LoadConnections: no connections file found — returning empty")
		return "[]", nil
	}
	data, err := s.fs.ReadFile("connections.json")
	if err != nil {
		log.Error("LoadConnections: read failed: %v", err)
		return "[]", err
	}
	log.Debug("LoadConnections: loaded %d bytes", len(data))
	return data, nil
}

// SaveConnections persists connection configs
func (s *Service) SaveConnections(connectionsJSON string) error {
	log.Debug("SaveConnections: writing %d bytes", len(connectionsJSON))
	return s.fs.WriteFile("connections.json", connectionsJSON)
}
