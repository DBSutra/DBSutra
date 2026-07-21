// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import (
	"context"
	"database/sql"
	"sync"

	clog "clientdb/backend/log"
	"clientdb/backend/security"

	_ "modernc.org/sqlite"
)

var log = clog.New("state")

// Service manages persistent application state via SQLite
type Service struct {
	ctx        context.Context
	db         *sql.DB
	mu         sync.RWMutex
	encKey     []byte // AES-256 master key for encrypting sensitive values
}

// NewService creates a new state service with SQLite at the given path
func NewService(dbPath string) (*Service, error) {
	log.Info("Opening SQLite database: %s", dbPath)

	db, err := sql.Open("sqlite", dbPath+"?_journal=WAL&_busy_timeout=5000")
	if err != nil {
		log.Error("Failed to open SQLite at %s: %v", dbPath, err)
		return nil, err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		log.Error("SQLite ping failed at %s: %v", dbPath, err)
		db.Close()
		return nil, err
	}
	log.Info("SQLite connection verified")

	// Performance optimizations
	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA synchronous=NORMAL")
	db.Exec("PRAGMA cache_size=-64000")   // 64MB cache
	db.Exec("PRAGMA temp_store=MEMORY")
	db.Exec("PRAGMA mmap_size=268435456") // 256MB memory-mapped I/O
	db.Exec("PRAGMA busy_timeout=5000")
	db.Exec("PRAGMA optimize")
	log.Info("SQLite PRAGMA optimizations applied")

	// Obtain the master encryption key for protecting sensitive data.
	encKey, err := security.GetOrCreateMasterKey()
	if err != nil {
		log.Error("Failed to obtain master encryption key: %v", err)
		db.Close()
		return nil, err
	}
	log.Info("Master encryption key ready")

	svc := &Service{db: db, encKey: encKey}
	log.Info("Running database migrations...")
	if err := svc.migrate(); err != nil {
		log.Error("Migration failed: %v", err)
		db.Close()
		return nil, err
	}
	log.Info("Database ready — %s", dbPath)
	return svc, nil
}

func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *Service) migrate() error {
	tables := []struct {
		name string
		stmt string
	}{
		{"kv_store", `CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL)`},
		{"appearance", `CREATE TABLE IF NOT EXISTS appearance (key TEXT PRIMARY KEY, value TEXT NOT NULL)`},
		{"fonts", `CREATE TABLE IF NOT EXISTS fonts (key TEXT PRIMARY KEY, value TEXT NOT NULL)`},
		{"panel_config", `CREATE TABLE IF NOT EXISTS panel_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`},
		{"dock_layout", `CREATE TABLE IF NOT EXISTS dock_layout (id TEXT PRIMARY KEY DEFAULT 'current', payload TEXT NOT NULL, updated INTEGER DEFAULT (strftime('%s','now')))`},
		{"shortcuts", `CREATE TABLE IF NOT EXISTS shortcuts (command_id TEXT PRIMARY KEY, keybinding TEXT NOT NULL, enabled INTEGER DEFAULT 1)`},
		{"color_overrides", `CREATE TABLE IF NOT EXISTS color_overrides (key TEXT PRIMARY KEY, value TEXT NOT NULL)`},
		{"connections", `CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, config TEXT NOT NULL, created INTEGER DEFAULT (strftime('%s','now')), updated INTEGER DEFAULT (strftime('%s','now')))`},
		{"query_history", `CREATE TABLE IF NOT EXISTS query_history (id INTEGER PRIMARY KEY AUTOINCREMENT, conn_id TEXT, query TEXT NOT NULL, status TEXT DEFAULT 'success', rows INTEGER DEFAULT 0, duration INTEGER DEFAULT 0, timestamp INTEGER DEFAULT (strftime('%s','now')))`},
		{"themes", `CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, name TEXT NOT NULL, colors TEXT NOT NULL, is_builtin INTEGER DEFAULT 0, created INTEGER DEFAULT (strftime('%s','now')), updated INTEGER DEFAULT (strftime('%s','now')))`},
	}

	for _, t := range tables {
		if _, err := s.db.Exec(t.stmt); err != nil {
			log.Error("Migration failed for table %s: %v", t.name, err)
			return err
		}
		log.Debug("Table ready: %s", t.name)
	}
	log.Info("All %d tables migrated successfully", len(tables))

	// Migration: rename 'token' → 'key' in color_overrides for existing DBs
	var colName string
	row := s.db.QueryRow("SELECT name FROM pragma_table_info('color_overrides') WHERE name = 'token'")
	if row.Scan(&colName) == nil && colName == "token" {
		log.Info("Migrating color_overrides: renaming 'token' column to 'key'")
		if _, err := s.db.Exec("ALTER TABLE color_overrides RENAME COLUMN token TO key"); err != nil {
			log.Warn("Column rename failed (may already be renamed): %v", err)
		} else {
			log.Info("Column rename successful")
		}
	}

	return nil
}

// newServiceForTest creates a service with a randomly generated encryption key,
// bypassing the OS keychain. Used only in tests.
func newServiceForTest(dbPath string) (*Service, error) {
	db, err := sql.Open("sqlite", dbPath+"?_journal=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	encKey, err := security.GenerateKey()
	if err != nil {
		db.Close()
		return nil, err
	}

	svc := &Service{db: db, encKey: encKey}
	if err := svc.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	return svc, nil
}

// Close closes the database connection
func (s *Service) Close() error {
	log.Info("Closing SQLite database")
	err := s.db.Close()
	if err != nil {
		log.Error("SQLite close error: %v", err)
	} else {
		log.Info("SQLite database closed")
	}
	return err
}
