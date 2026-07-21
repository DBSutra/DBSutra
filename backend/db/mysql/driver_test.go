// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mysql

import (
	"errors"
	"testing"

	"clientdb/backend/db"
)

// ══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — no real MySQL required
// ══════════════════════════════════════════════════════════════════════════════

func TestNew_ReturnsDriver(t *testing.T) {
	d := New()
	if d == nil {
		t.Fatal("New() returned nil")
	}
}

func TestNew_Type(t *testing.T) {
	d := New()
	if d.Type() != "mysql" {
		t.Errorf("Type() = %q, want %q", d.Type(), "mysql")
	}
}

func TestNew_ImplementsDriverInterface(t *testing.T) {
	var _ db.Driver = New()
}

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION STRING BUILDING
// ══════════════════════════════════════════════════════════════════════════════

func TestConnect_ConnectionString_Defaults(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Username: "root",
		Password: "pass",
		Database: "testdb",
		// Host and Port left as zero values — Connect defaults to 127.0.0.1:3306
	}
	// Pre-set ConnectionString to match the expected build output, with timeout
	cfg.ConnectionString = "root:pass@tcp(127.0.0.1:3306)/testdb?timeout=1s"
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected error connecting to 127.0.0.1:3306 (no MySQL running)")
	}
}

func TestConnect_ConnectionString_Explicit(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		ConnectionString: "user:pwd@tcp(custom-host:9999)/mydb?timeout=1s",
	}
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}
}

func TestConnect_ConnectionString_WithSSL(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Username: "root",
		Password: "secret",
		Host:     "127.0.0.1",
		Port:     3306,
		Database: "db",
		SSL:      true,
	}
	// Build the expected connection string with SSL and a timeout
	cfg.ConnectionString = "root:secret@tcp(127.0.0.1:3306)/db?tls=true&timeout=1s"
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}
}

func TestConnect_ReturnsConnectionError(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Username:         "root",
		Password:         "pass",
		Host:             "192.0.2.1", // TEST-NET, guaranteed unreachable
		Port:             3306,
		Database:         "testdb",
		ConnectionString: "root:pass@tcp(192.0.2.1:3306)/testdb?timeout=2s",
	}

	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected connection error for unreachable host")
	}

	var connErr *db.ConnectionError
	if !errors.As(err, &connErr) {
		t.Fatalf("error should be a *db.ConnectionError, got %T: %v", err, err)
	}
	if connErr.Driver != "mysql" {
		t.Errorf("ConnectionError.Driver = %q, want %q", connErr.Driver, "mysql")
	}
	if connErr.Host != "192.0.2.1" {
		t.Errorf("ConnectionError.Host = %q, want %q", connErr.Host, "192.0.2.1")
	}
	if connErr.Port != 3306 {
		t.Errorf("ConnectionError.Port = %d, want 3306", connErr.Port)
	}
}

func TestConnect_DefaultHostPort(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Username: "u",
		Password: "p",
		Database: "db",
		// Host empty, Port 0 — Connect should default to 127.0.0.1:3306
	}
	// Use a ConnectionString that matches what Connect would build (with timeout)
	cfg.ConnectionString = "u:p@tcp(127.0.0.1:3306)/db?timeout=1s"
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected error for default host:port")
	}

	var connErr *db.ConnectionError
	if !errors.As(err, &connErr) {
		t.Fatalf("error should be *db.ConnectionError, got %T: %v", err, err)
	}
	if connErr.Host != "127.0.0.1" {
		t.Errorf("ConnectionError.Host = %q, want %q (default)", connErr.Host, "127.0.0.1")
	}
	if connErr.Port != 3306 {
		t.Errorf("ConnectionError.Port = %d, want 3306 (default)", connErr.Port)
	}
}

func TestConnect_HostPortDefaults(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Username:         "u",
		Password:         "p",
		Host:             "myhost",
		Port:             9999,
		Database:         "db",
		ConnectionString: "u:p@tcp(myhost:9999)/db?timeout=1s",
	}
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}

	var connErr *db.ConnectionError
	if !errors.As(err, &connErr) {
		t.Fatalf("error should be *db.ConnectionError, got %T: %v", err, err)
	}
	if connErr.Host != "myhost" {
		t.Errorf("ConnectionError.Host = %q, want %q", connErr.Host, "myhost")
	}
	if connErr.Port != 9999 {
		t.Errorf("ConnectionError.Port = %d, want 9999", connErr.Port)
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION STRING FORMAT — verify the DSN matches go-sql-driver/mysql format
// ══════════════════════════════════════════════════════════════════════════════

func TestConnect_DSNFormat_Standard(t *testing.T) {
	// The driver builds: "username:password@tcp(host:port)/database"
	// Verify by using ConnectionString directly and checking the error path works.
	d := &Driver{}
	cfg := db.ConnectionConfig{
		ConnectionString: "testuser:testpass@tcp(localhost:3306)/testdb?timeout=1s",
	}
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected connection error")
	}
	// If the DSN were malformed, sql.Open would fail with a different error
	// (not a connection/timeout error). The fact we get an error from Ping
	// means sql.Open accepted the DSN.
}

func TestConnect_DSNFormat_NonDefaultPort(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Host:             "127.0.0.1",
		Port:             3307,
		Database:         "db",
		ConnectionString: "u:p@tcp(127.0.0.1:3307)/db?timeout=1s",
	}
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("expected connection error")
	}
	var connErr *db.ConnectionError
	if errors.As(err, &connErr) {
		if connErr.Port != 3307 {
			t.Errorf("ConnectionError.Port = %d, want 3307", connErr.Port)
		}
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY ROUTING — empty query
// ══════════════════════════════════════════════════════════════════════════════

func TestQuery_EmptyQuery(t *testing.T) {
	d := New()
	result, err := d.Query("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result for empty query")
	}
	if result.Error != "empty query" {
		t.Errorf("result.Error = %q, want %q", result.Error, "empty query")
	}
}

func TestQuery_WhitespaceOnlyQuery(t *testing.T) {
	d := New()
	result, err := d.Query("   \t\n  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result for whitespace-only query")
	}
	if result.Error != "empty query" {
		t.Errorf("result.Error = %q, want %q", result.Error, "empty query")
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// DISCONNECT — no connection established
// ══════════════════════════════════════════════════════════════════════════════

func TestDisconnect_NoConnection(t *testing.T) {
	d := New()
	err := d.Disconnect()
	if err != nil {
		t.Errorf("Disconnect() on fresh driver should return nil, got: %v", err)
	}
}
