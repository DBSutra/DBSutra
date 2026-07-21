// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build integration

package mongodb

import (
	"clientdb/backend/db"
	"strings"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — require network access and (optionally) a running MongoDB
// Run with: go test -tags=integration -v -count=1 ./backend/db/mongodb/
// ══════════════════════════════════════════════════════════════════════════════

func TestConnect_InvalidURI(t *testing.T) {
	d := New()
	cfg := db.ConnectionConfig{
		Type:             "mongodb",
		ConnectionString: "mongodb://invalid.host.that.does.not.exist:99999",
		Database:         "testdb",
	}
	err := d.Connect(cfg)
	if err == nil {
		d.Disconnect()
		t.Fatal("Connect with invalid URI should return an error")
	}
	if !strings.Contains(err.Error(), "connect failed") && !strings.Contains(err.Error(), "ping failed") {
		t.Errorf("expected connect/ping error, got: %v", err)
	}
}

func TestConnect_InvalidScheme(t *testing.T) {
	d := New()
	cfg := db.ConnectionConfig{
		Type:             "mongodb",
		ConnectionString: "not-a-valid-uri",
		Database:         "testdb",
	}
	err := d.Connect(cfg)
	if err == nil {
		d.Disconnect()
		t.Fatal("Connect with invalid scheme should return an error")
	}
}

func TestConnect_EmptyHostDefaults(t *testing.T) {
	// With empty host/port, Connect builds mongodb://127.0.0.1:27017
	// and attempts to connect — should fail if no local MongoDB is running.
	d := New()
	cfg := db.ConnectionConfig{
		Type:     "mongodb",
		Database: "testdb",
	}
	err := d.Connect(cfg)
	if err == nil {
		// If a local MongoDB happens to be running, clean up and pass
		d.Disconnect()
		t.Log("local MongoDB is running; default host/port connection succeeded")
		return
	}
	// Expected: connection refused or ping failure
	if !strings.Contains(err.Error(), "connect failed") && !strings.Contains(err.Error(), "ping failed") {
		t.Errorf("unexpected error type: %v", err)
	}
}

func TestConnect_WithCredentials(t *testing.T) {
	d := New()
	cfg := db.ConnectionConfig{
		Type:     "mongodb",
		Host:     "127.0.0.1",
		Port:     27017,
		Username: "testuser",
		Password: "testpass",
		Database: "testdb",
	}
	err := d.Connect(cfg)
	if err == nil {
		d.Disconnect()
		t.Log("connection with credentials succeeded (MongoDB is running and auth is configured)")
		return
	}
	if !strings.Contains(err.Error(), "connect failed") && !strings.Contains(err.Error(), "ping failed") {
		t.Errorf("unexpected error type: %v", err)
	}
}
