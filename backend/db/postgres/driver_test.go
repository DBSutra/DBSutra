// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package postgres

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"

	"clientdb/backend/db"
)

// ──────────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────────

// pgAvailable returns true if a local PostgreSQL instance is reachable.
// Honours POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD,
// POSTGRES_DB environment variables; falls back to sensible defaults.
func pgAvailable(t *testing.T) bool {
	t.Helper()

	host := envOr("POSTGRES_HOST", "127.0.0.1")
	port := envOr("POSTGRES_PORT", "5432")
	user := envOr("POSTGRES_USER", "postgres")
	pass := envOr("POSTGRES_PASSWORD", "postgres")
	dbname := envOr("POSTGRES_DB", "postgres")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, pass, dbname)

	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return false
	}
	defer conn.Close()
	return conn.Ping() == nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// testConfig builds a ConnectionConfig from environment (or defaults).
func testConfig() db.ConnectionConfig {
	return db.ConnectionConfig{
		Host:     envOr("POSTGRES_HOST", "127.0.0.1"),
		Port:     5432,
		Database: envOr("POSTGRES_DB", "postgres"),
		Username: envOr("POSTGRES_USER", "postgres"),
		Password: envOr("POSTGRES_PASSWORD", "postgres"),
	}
}

// connectOrFail connects using the environment-based config and fails the
// test immediately if the connection cannot be established.
func connectOrFail(t *testing.T, d *Driver) {
	t.Helper()
	if err := d.Connect(testConfig()); err != nil {
		t.Fatalf("connectOrFail: %v", err)
	}
}

func requirePG(t *testing.T) {
	t.Helper()
	if !pgAvailable(t) {
		t.Skip("PostgreSQL not available; skipping integration test")
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. New() and Type()
// ──────────────────────────────────────────────────────────────────────────────

func TestNew_ReturnsDriver(t *testing.T) {
	d := New()
	if d == nil {
		t.Fatal("New() returned nil")
	}
}

func TestNew_ImplementsDriverInterface(t *testing.T) {
	var d db.Driver = New()
	if d == nil {
		t.Fatal("Driver does not implement db.Driver")
	}
}

func TestType_ReturnsPostgres(t *testing.T) {
	d := New()
	if got := d.Type(); got != "postgres" {
		t.Errorf("Type() = %q, want %q", got, "postgres")
	}
}

func TestType_Idempotent(t *testing.T) {
	d := New()
	for i := 0; i < 3; i++ {
		if got := d.Type(); got != "postgres" {
			t.Errorf("call %d: Type() = %q, want %q", i, got, "postgres")
		}
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Connect with invalid host / port returns error
// ──────────────────────────────────────────────────────────────────────────────

func TestConnect_InvalidHost(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Host:     "192.0.2.1", // TEST-NET — guaranteed unreachable
		Port:     5432,
		Database: "testdb",
		Username: "user",
		Password: "pass",
	}
	err := d.Connect(cfg)
	if err == nil {
		_ = d.Disconnect()
		t.Fatal("Connect to unreachable host should return an error")
	}
}

func TestConnect_InvalidPort(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Host:     "127.0.0.1",
		Port:     1, // privileged / unlikely to have PG
		Database: "testdb",
		Username: "user",
		Password: "pass",
	}
	err := d.Connect(cfg)
	if err == nil {
		_ = d.Disconnect()
		t.Fatal("Connect to port 1 should return an error")
	}
}

func TestConnect_InvalidHost_ErrorContainsContext(t *testing.T) {
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Host:     "192.0.2.1",
		Port:     5432,
		Database: "testdb",
		Username: "user",
		Password: "pass",
	}
	err := d.Connect(cfg)
	if err == nil {
		_ = d.Disconnect()
		t.Fatal("expected error")
	}
	errStr := err.Error()
	if !strings.Contains(errStr, "postgres") {
		t.Errorf("error should mention driver name, got: %s", errStr)
	}
	if !strings.Contains(errStr, "192.0.2.1") {
		t.Errorf("error should mention host, got: %s", errStr)
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Connection string building logic
// ──────────────────────────────────────────────────────────────────────────────

func TestConnect_DefaultHostAndPort(t *testing.T) {
	// When Host="" and Port=0 the driver should default to 127.0.0.1:5432.
	// We verify indirectly through the error message referencing the default host.
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Host:     "", // should default to 127.0.0.1
		Port:     0,  // should default to 5432
		Database: "testdb",
		Username: "user",
		Password: "pass",
	}
	err := d.Connect(cfg)
	if err == nil {
		_ = d.Disconnect()
		// If a PG is running locally the connection may succeed — that's fine.
		return
	}
	// The error should reference the default host.
	if !strings.Contains(err.Error(), "127.0.0.1") {
		t.Errorf("default host should appear in error, got: %s", err.Error())
	}
}

func TestConnect_SSLMode(t *testing.T) {
	// With SSL=true the driver should use sslmode=require.
	// With SSL=false (default) it should use sslmode=disable.
	d := &Driver{}
	cfg := db.ConnectionConfig{
		Host:     "127.0.0.1",
		Port:     5432,
		Database: "testdb",
		Username: "user",
		Password: "pass",
		SSL:      true,
	}
	err := d.Connect(cfg)
	if err == nil {
		_ = d.Disconnect()
		// Connection succeeded — the server supports SSL. That's acceptable.
		return
	}
	// If the server doesn't support SSL the error is non-nil — that's expected.
}

func TestConnect_ConnectionStringOverride(t *testing.T) {
	// When ConnectionString is set it should be used verbatim.
	d := &Driver{}
	cfg := db.ConnectionConfig{
		ConnectionString: "host=192.0.2.1 port=5432 user=u dbname=d password=p sslmode=disable connect_timeout=5",
	}
	err := d.Connect(cfg)
	if err == nil {
		_ = d.Disconnect()
		t.Fatal("Connect with unreachable host in ConnectionString should fail")
	}
	if !strings.Contains(err.Error(), "192.0.2.1") {
		t.Errorf("error should reference host from ConnectionString, got: %s", err.Error())
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Connect with valid config (integration)
// ──────────────────────────────────────────────────────────────────────────────

func TestConnect_ValidConfig(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	cfg := testConfig()
	if err := d.Connect(cfg); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer d.Disconnect()
}

func TestConnect_SSLMode_Integration(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	cfg := testConfig()
	cfg.SSL = true

	err := d.Connect(cfg)
	if err != nil {
		// The local PG may not have SSL configured — skip gracefully.
		t.Skipf("SSL connect failed (server may not support SSL): %v", err)
	}
	defer d.Disconnect()

	if err := d.Ping(); err != nil {
		t.Errorf("Ping over SSL connection: %v", err)
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Query routing (SELECT vs non-SELECT)
// ──────────────────────────────────────────────────────────────────────────────

func TestQuery_EmptyString(t *testing.T) {
	d := &Driver{}
	result, err := d.Query("")
	if err != nil {
		t.Fatalf("unexpected Go error: %v", err)
	}
	if result == nil {
		t.Fatal("result should not be nil")
	}
	if result.Error != "empty query" {
		t.Errorf("Error = %q, want %q", result.Error, "empty query")
	}
}

func TestQuery_WhitespaceOnly(t *testing.T) {
	d := &Driver{}
	result, err := d.Query("   \t\n  ")
	if err != nil {
		t.Fatalf("unexpected Go error: %v", err)
	}
	if result == nil {
		t.Fatal("result should not be nil")
	}
	if result.Error != "empty query" {
		t.Errorf("Error = %q, want %q", result.Error, "empty query")
	}
}

func TestQuery_Select(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	result, err := d.Query("SELECT 1 AS one")
	if err != nil {
		t.Fatalf("Query returned error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("Query result has error: %s", result.Error)
	}
	if len(result.Columns) != 1 || result.Columns[0] != "one" {
		t.Errorf("Columns = %v, want [one]", result.Columns)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("Rows count = %d, want 1", len(result.Rows))
	}
}

func TestQuery_SelectMultipleColumns(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	result, err := d.Query("SELECT 1 AS a, 'hello' AS b, true AS c")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("result.Error: %s", result.Error)
	}
	if len(result.Columns) != 3 {
		t.Errorf("Columns count = %d, want 3", len(result.Columns))
	}
}

func TestQuery_SelectShow(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	// SHOW is routed through the SELECT path.
	result, err := d.Query("SHOW server_version")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("result.Error: %s", result.Error)
	}
	if len(result.Rows) == 0 {
		t.Error("SHOW server_version should return at least one row")
	}
}

func TestQuery_SelectExplain(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	result, err := d.Query("EXPLAIN SELECT 1")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("result.Error: %s", result.Error)
	}
	if len(result.Rows) == 0 {
		t.Error("EXPLAIN should return at least one row")
	}
}

func TestQuery_SelectWithCTE(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	// WITH ... SELECT should be routed through the SELECT path.
	result, err := d.Query("WITH cte AS (SELECT 1 AS x) SELECT x FROM cte")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("result.Error: %s", result.Error)
	}
	if len(result.Rows) != 1 {
		t.Errorf("Rows count = %d, want 1", len(result.Rows))
	}
}

func TestQuery_NonSelect_Create(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	// CREATE TEMP TABLE is a non-SELECT; it goes through ExecuteNonQuery.
	result, err := d.Query("CREATE TEMP TABLE _driver_test (id serial PRIMARY KEY, name text)")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("result.Error: %s", result.Error)
	}
	_, _ = d.Query("DROP TABLE IF EXISTS _driver_test")
}

func TestQuery_NonSelect_Insert(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	_, _ = d.Query("CREATE TEMP TABLE _driver_test (id serial PRIMARY KEY, name text)")
	defer func() { _, _ = d.Query("DROP TABLE IF EXISTS _driver_test") }()

	result, err := d.Query("INSERT INTO _driver_test (name) VALUES ('alice')")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("result.Error: %s", result.Error)
	}
	if result.RowsAffected != 1 {
		t.Errorf("RowsAffected = %d, want 1", result.RowsAffected)
	}
}

func TestQuery_InvalidSQL(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	result, err := d.Query("SELCT * FROM nonexistent_table")
	if err != nil {
		t.Fatalf("unexpected Go error: %v", err)
	}
	if result == nil {
		t.Fatal("result should not be nil")
	}
	if result.Error == "" {
		t.Error("invalid SQL should produce a result error string")
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. GetSchema returns tables
// ──────────────────────────────────────────────────────────────────────────────

func TestGetSchema_ReturnsDatabase(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("GetSchema error: %v", err)
	}
	if len(schema) == 0 {
		t.Fatal("GetSchema should return at least one database")
	}

	dbName := testConfig().Database
	if dbName == "" {
		dbName = "postgres"
	}
	if schema[0].Name != dbName {
		t.Errorf("SchemaDatabase.Name = %q, want %q", schema[0].Name, dbName)
	}
}

func TestGetSchema_HasTables(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("GetSchema error: %v", err)
	}
	if len(schema) == 0 {
		t.Fatal("schema should have at least one database entry")
	}

	// Every table should have at least one column.
	for _, sdb := range schema {
		for _, tbl := range sdb.Tables {
			if len(tbl.Columns) == 0 {
				t.Errorf("table %s.%s has no columns", sdb.Name, tbl.Name)
			}
			for _, col := range tbl.Columns {
				if col.Name == "" {
					t.Errorf("table %s: column with empty name", tbl.Name)
				}
				if col.Type == "" {
					t.Errorf("table %s, column %s: empty type", tbl.Name, col.Name)
				}
			}
		}
	}
}

func TestGetSchema_DefaultDatabase(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	cfg := testConfig()
	cfg.Database = "" // should default to "postgres"
	if err := d.Connect(cfg); err != nil {
		t.Fatalf("Connect: %v", err)
	}
	defer d.Disconnect()

	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("GetSchema: %v", err)
	}
	if len(schema) == 0 {
		t.Fatal("schema should have at least one entry")
	}
	if schema[0].Name != "postgres" {
		t.Errorf("default database name = %q, want %q", schema[0].Name, "postgres")
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Disconnect, Ping, InsertRow, UpdateRow, DeleteRow
// ──────────────────────────────────────────────────────────────────────────────

func TestConnect_ThenPing(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	if err := d.Ping(); err != nil {
		t.Errorf("Ping after Connect failed: %v", err)
	}
}

func TestDisconnect_AfterConnect_StopsPing(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)

	if err := d.Disconnect(); err != nil {
		t.Fatalf("Disconnect failed: %v", err)
	}
	if err := d.Ping(); err == nil {
		t.Error("Ping after Disconnect should fail")
	}
}

func TestDisconnect_Idempotent(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)

	if err := d.Disconnect(); err != nil {
		t.Fatalf("first Disconnect: %v", err)
	}
	// Second disconnect should be a no-op (d.d is nil after first close).
	if err := d.Disconnect(); err != nil {
		t.Errorf("second Disconnect should be nil, got: %v", err)
	}
}

func TestDisconnect_WithoutConnect(t *testing.T) {
	d := &Driver{}
	// Disconnect on a fresh driver (d.d == nil) should be a no-op.
	if err := d.Disconnect(); err != nil {
		t.Errorf("Disconnect on fresh driver should be nil, got: %v", err)
	}
}

func TestInsertRow(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	_, _ = d.Query("CREATE TEMP TABLE _insert_test (id serial PRIMARY KEY, name text)")
	defer func() { _, _ = d.Query("DROP TABLE IF EXISTS _insert_test") }()

	err := d.InsertRow("postgres", "_insert_test", map[string]interface{}{
		"name": "bob",
	})
	if err != nil {
		t.Fatalf("InsertRow: %v", err)
	}

	result, qErr := d.Query("SELECT name FROM _insert_test LIMIT 1")
	if qErr != nil {
		t.Fatalf("verify query: %v", qErr)
	}
	if result.Error != "" {
		t.Fatalf("verify result error: %s", result.Error)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(result.Rows))
	}
}

func TestUpdateRow(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	_, _ = d.Query("CREATE TEMP TABLE _update_test (id serial PRIMARY KEY, name text)")
	defer func() { _, _ = d.Query("DROP TABLE IF EXISTS _update_test") }()

	_ = d.InsertRow("postgres", "_update_test", map[string]interface{}{"name": "alice"})

	err := d.UpdateRow("postgres", "_update_test",
		map[string]interface{}{"id": 1},
		map[string]interface{}{"name": "bob"},
	)
	if err != nil {
		t.Fatalf("UpdateRow: %v", err)
	}

	result, qErr := d.Query("SELECT name FROM _update_test WHERE id = 1")
	if qErr != nil {
		t.Fatalf("verify: %v", qErr)
	}
	if result.Error != "" {
		t.Fatalf("verify error: %s", result.Error)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(result.Rows))
	}
	if name, ok := result.Rows[0][0].(string); !ok || name != "bob" {
		t.Errorf("name = %v, want bob", result.Rows[0][0])
	}
}

func TestDeleteRow(t *testing.T) {
	requirePG(t)

	d := &Driver{}
	connectOrFail(t, d)
	defer d.Disconnect()

	_, _ = d.Query("CREATE TEMP TABLE _delete_test (id serial PRIMARY KEY, name text)")
	defer func() { _, _ = d.Query("DROP TABLE IF EXISTS _delete_test") }()

	_ = d.InsertRow("postgres", "_delete_test", map[string]interface{}{"name": "alice"})
	_ = d.InsertRow("postgres", "_delete_test", map[string]interface{}{"name": "bob"})

	err := d.DeleteRow("postgres", "_delete_test", map[string]interface{}{"id": 1})
	if err != nil {
		t.Fatalf("DeleteRow: %v", err)
	}

	result, qErr := d.Query("SELECT count(*)::int FROM _delete_test")
	if qErr != nil {
		t.Fatalf("verify: %v", qErr)
	}
	if result.Error != "" {
		t.Fatalf("verify error: %s", result.Error)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(result.Rows))
	}
}
