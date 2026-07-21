// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build integration

package main

import (
	"os"
	"testing"

	"clientdb/backend/db"
	"clientdb/backend/db/mysql"
	"clientdb/backend/db/postgres"
	"clientdb/backend/db/redis"
	"clientdb/backend/db/sqlite"
)

// ──────────────────────────────────────────────────────────────────────────────
// Integration tests — require running database services
// Run with: go test -tags integration ./backend/... -v
// ──────────────────────────────────────────────────────────────────────────────

func getEnvOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func TestIntegration_Postgres(t *testing.T) {
	connStr := os.Getenv("TEST_POSTGRES_URL")
	if connStr == "" {
		t.Skip("TEST_POSTGRES_URL not set — skipping PostgreSQL integration test")
	}

	d := postgres.New()
	cfg := db.ConnectionConfig{
		Type:             "postgres",
		ConnectionString: connStr,
	}

	if err := d.Connect(cfg); err != nil {
		t.Fatalf("PostgreSQL connect failed: %v", err)
	}
	defer d.Disconnect()

	// Test ping
	if err := d.Ping(); err != nil {
		t.Fatalf("PostgreSQL ping failed: %v", err)
	}

	// Test query
	result, err := d.Query("SELECT 1 as id, 'hello' as name")
	if err != nil {
		t.Fatalf("PostgreSQL query failed: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("PostgreSQL query returned error: %s", result.Error)
	}
	if len(result.Columns) != 2 {
		t.Fatalf("Expected 2 columns, got %d", len(result.Columns))
	}
	if len(result.Rows) != 1 {
		t.Fatalf("Expected 1 row, got %d", len(result.Rows))
	}

	// Test schema
	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("PostgreSQL GetSchema failed: %v", err)
	}
	t.Logf("PostgreSQL schema: %d databases found", len(schema))

	// Test insert/update/delete cycle
	_, err = d.Query("CREATE TABLE IF NOT EXISTS _clientdb_test (id SERIAL PRIMARY KEY, name TEXT)")
	if err != nil {
		t.Fatalf("CREATE TABLE failed: %v", err)
	}
	defer d.Query("DROP TABLE IF EXISTS _clientdb_test")

	err = d.InsertRow("testdb", "_clientdb_test", map[string]interface{}{"name": "test1"})
	if err != nil {
		t.Fatalf("InsertRow failed: %v", err)
	}

	err = d.UpdateRow("testdb", "_clientdb_test", map[string]interface{}{"id": 1}, map[string]interface{}{"name": "updated"})
	if err != nil {
		t.Fatalf("UpdateRow failed: %v", err)
	}

	err = d.DeleteRow("testdb", "_clientdb_test", map[string]interface{}{"id": 1})
	if err != nil {
		t.Fatalf("DeleteRow failed: %v", err)
	}
}

func TestIntegration_MySQL(t *testing.T) {
	connStr := os.Getenv("TEST_MYSQL_URL")
	if connStr == "" {
		t.Skip("TEST_MYSQL_URL not set — skipping MySQL integration test")
	}

	d := mysql.New()
	cfg := db.ConnectionConfig{
		Type:             "mysql",
		ConnectionString: connStr,
	}

	if err := d.Connect(cfg); err != nil {
		t.Fatalf("MySQL connect failed: %v", err)
	}
	defer d.Disconnect()

	if err := d.Ping(); err != nil {
		t.Fatalf("MySQL ping failed: %v", err)
	}

	result, err := d.Query("SELECT 1 as id, 'hello' as name")
	if err != nil {
		t.Fatalf("MySQL query failed: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("MySQL query returned error: %s", result.Error)
	}

	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("MySQL GetSchema failed: %v", err)
	}
	t.Logf("MySQL schema: %d databases found", len(schema))
}

func TestIntegration_Redis(t *testing.T) {
	addr := os.Getenv("TEST_REDIS_URL")
	if addr == "" {
		t.Skip("TEST_REDIS_URL not set — skipping Redis integration test")
	}

	d := redis.New()
	cfg := db.ConnectionConfig{
		Type: "redis",
		Host: addr,
		Port: 6379,
	}

	if err := d.Connect(cfg); err != nil {
		t.Fatalf("Redis connect failed: %v", err)
	}
	defer d.Disconnect()

	if err := d.Ping(); err != nil {
		t.Fatalf("Redis ping failed: %v", err)
	}

	// Test SET/GET
	_, err := d.Query("SET _clientdb_test_key hello")
	if err != nil {
		t.Fatalf("Redis SET failed: %v", err)
	}
	defer d.Query("DEL _clientdb_test_key")

	result, err := d.Query("GET _clientdb_test_key")
	if err != nil {
		t.Fatalf("Redis GET failed: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("Redis GET returned error: %s", result.Error)
	}
}

func TestIntegration_SQLite(t *testing.T) {
	d := sqlite.New()
	cfg := db.ConnectionConfig{
		Type:     "sqlite",
		Database: ":memory:",
	}

	if err := d.Connect(cfg); err != nil {
		t.Fatalf("SQLite connect failed: %v", err)
	}
	defer d.Disconnect()

	if err := d.Ping(); err != nil {
		t.Fatalf("SQLite ping failed: %v", err)
	}

	// Test CREATE TABLE
	_, err := d.Query("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
	if err != nil {
		t.Fatalf("SQLite CREATE TABLE failed: %v", err)
	}

	// Test INSERT
	result, err := d.Query("INSERT INTO test (name) VALUES ('hello')")
	if err != nil {
		t.Fatalf("SQLite INSERT failed: %v", err)
	}
	if result.RowsAffected != 1 {
		t.Fatalf("Expected 1 row affected, got %d", result.RowsAffected)
	}

	// Test SELECT
	result, err = d.Query("SELECT * FROM test")
	if err != nil {
		t.Fatalf("SQLite SELECT failed: %v", err)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("Expected 1 row, got %d", len(result.Rows))
	}

	// Test schema
	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("SQLite GetSchema failed: %v", err)
	}
	if len(schema) == 0 {
		t.Fatal("Expected at least one database in schema")
	}
	t.Logf("SQLite schema: %d databases, tables in first db: %d", len(schema), len(schema[0].Tables))

	// Test InsertRow
	err = d.InsertRow("", "test", map[string]interface{}{"name": "test2"})
	if err != nil {
		t.Fatalf("SQLite InsertRow failed: %v", err)
	}

	// Test UpdateRow
	err = d.UpdateRow("", "test", map[string]interface{}{"id": 2}, map[string]interface{}{"name": "updated"})
	if err != nil {
		t.Fatalf("SQLite UpdateRow failed: %v", err)
	}

	// Test DeleteRow
	err = d.DeleteRow("", "test", map[string]interface{}{"id": 2})
	if err != nil {
		t.Fatalf("SQLite DeleteRow failed: %v", err)
	}
}

func TestIntegration_DBService(t *testing.T) {
	// Test the full service with SQLite
	svc := db.NewService()
	svc.RegisterDriver("sqlite", sqlite.New)
	svc.SetContext(t)

	cfg := db.ConnectionConfig{
		ID:       "test-sqlite",
		Type:     "sqlite",
		Database: ":memory:",
	}

	connID, err := svc.Connect(cfg)
	if err != nil {
		t.Fatalf("Service Connect failed: %v", err)
	}
	if connID != "test-sqlite" {
		t.Fatalf("Expected connID 'test-sqlite', got '%s'", connID)
	}

	// Test listing connections
	conns := svc.ListConnections()
	if len(conns) != 1 {
		t.Fatalf("Expected 1 connection, got %d", len(conns))
	}

	// Test query through service
	_, err = svc.Query(connID, "CREATE TABLE svc_test (id INTEGER PRIMARY KEY, val TEXT)")
	if err != nil {
		t.Fatalf("Service Query failed: %v", err)
	}

	// Test schema through service
	schema, err := svc.GetSchema(connID)
	if err != nil {
		t.Fatalf("Service GetSchema failed: %v", err)
	}
	if len(schema) == 0 {
		t.Fatal("Expected schema from service")
	}

	// Test disconnect
	if err := svc.Disconnect(connID); err != nil {
		t.Fatalf("Service Disconnect failed: %v", err)
	}
	if len(svc.ListConnections()) != 0 {
		t.Fatal("Expected 0 connections after disconnect")
	}

	// Test close all (should be no-op with no connections)
	svc.CloseAll()
}
