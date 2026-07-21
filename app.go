// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package main

import (
	"context"
	"os"
	"path/filepath"

	"clientdb/backend/db"
	"clientdb/backend/db/elasticsearch"
	"clientdb/backend/db/mongodb"
	"clientdb/backend/db/mysql"
	"clientdb/backend/db/postgres"
	"clientdb/backend/db/redis"
	"clientdb/backend/db/sqlite"
	"clientdb/backend/fs"
	clog "clientdb/backend/log"
	"clientdb/backend/settings"
	"clientdb/backend/state"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var svcLog = clog.New("services")

// DBService wraps the database service for Wails v3 binding
type DBService struct {
	*db.Service
}

func (s *DBService) ServiceName() string { return "db" }

func (s *DBService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	svcLog.Info("[DBService] Starting up — setting context")
	s.SetContext(ctx)
	svcLog.Info("[DBService] Startup complete")
	return nil
}

func (s *DBService) ServiceShutdown() error {
	svcLog.Info("[DBService] Shutting down — closing all connections")
	connCount := len(s.ListConnections())
	s.CloseAll()
	svcLog.Info("[DBService] Shutdown complete — closed %d connection(s)", connCount)
	return nil
}

// StateService wraps the state service for Wails v3 binding
type StateService struct {
	*state.Service
}

func (s *StateService) ServiceName() string { return "state" }

func (s *StateService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	svcLog.Info("[StateService] Startup complete")
	return nil
}

func (s *StateService) ServiceShutdown() error {
	svcLog.Info("[StateService] Shutting down — closing SQLite")
	err := s.Close()
	if err != nil {
		svcLog.Error("[StateService] Shutdown error: %v", err)
	} else {
		svcLog.Info("[StateService] Shutdown complete")
	}
	return err
}

// SettingsService wraps the settings service for Wails v3 binding
type SettingsService struct {
	*settings.Service
}

func (s *SettingsService) ServiceName() string { return "settings" }

func (s *SettingsService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	svcLog.Info("[SettingsService] Starting up — setting context")
	s.SetContext(ctx)
	svcLog.Info("[SettingsService] Startup complete")
	return nil
}

// FSService wraps the filesystem service for Wails v3 binding
type FSService struct {
	*fs.Service
}

func (s *FSService) ServiceName() string { return "fs" }

func (s *FSService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	svcLog.Info("[FSService] Starting up — setting context")
	svcLog.Info("[FSService] App dir: %s", s.GetAppDir())
	s.SetContext(ctx)
	svcLog.Info("[FSService] Startup complete")
	return nil
}

// createServices initializes all backend services
func createServices() (*DBService, *StateService, *SettingsService, *FSService) {
	svcLog.Info("Creating filesystem service...")
	fsvc := fs.NewService()
	svcLog.Info("Filesystem service ready — app dir: %s", fsvc.GetAppDir())

	// Initialize SQLite state store
	svcLog.Info("Initializing SQLite state store...")
	home, err := os.UserHomeDir()
	if err != nil {
		svcLog.Warn("Failed to get home dir: %v — using current directory", err)
		home = "."
	}
	dbPath := filepath.Join(home, ".dbsutra", "state.db")
	svcLog.Info("State DB path: %s", dbPath)

	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		svcLog.Error("Failed to create data dir %s: %v", filepath.Dir(dbPath), err)
	}

	stateSvc, err := state.NewService(dbPath)
	if err != nil {
		svcLog.Error("Failed to open state DB at %s: %v", dbPath, err)
		svcLog.Warn("Falling back to in-memory SQLite — data will NOT persist!")
		stateSvc, _ = state.NewService(":memory:")
	} else {
		svcLog.Info("SQLite state store opened successfully")
	}

	// Create DB service and register all drivers
	svcLog.Info("Creating DB service and registering drivers...")
	dbSvc := db.NewService()

	drivers := map[string]func() db.Driver{
		"mysql":         mysql.New,
		"postgres":      postgres.New,
		"mongodb":       mongodb.New,
		"sqlite":        sqlite.New,
		"redis":         redis.New,
		"elasticsearch": elasticsearch.New,
	}
	for name, factory := range drivers {
		dbSvc.RegisterDriver(name, factory)
		svcLog.Debug("Registered driver: %s", name)
	}
	svcLog.Info("Registered %d database drivers: mysql, postgres, mongodb, sqlite, redis, elasticsearch", len(drivers))

	svcLog.Info("Creating settings service...")
	settingsSvc := settings.NewService(fsvc)

	svcLog.Info("All services created successfully")
	return &DBService{dbSvc}, &StateService{stateSvc}, &SettingsService{settingsSvc}, &FSService{fsvc}
}
