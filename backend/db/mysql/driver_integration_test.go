// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build integration

package mysql

import (
	"strings"
	"testing"

	"clientdb/backend/db"
)

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — require a running MySQL server on localhost:3306
//
// Run with:  go test -tags=integration -v ./backend/db/mysql/
// ══════════════════════════════════════════════════════════════════════════════

func testConfig() db.ConnectionConfig {
	return db.ConnectionConfig{
		Host:     "127.0.0.1",
		Port:     3306,
		Username: "root",
		Password: "",
		Database: "mysql",
	}
}

func connectOrFail(t *testing.T) db.Driver {
	t.Helper()
	d := New()
	if err := d.Connect(testConfig()); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	t.Cleanup(func() { d.Disconnect() })
	return d
}

func TestIntegration_Connect(t *testing.T) {
	d := New()
	cfg := testConfig()
	if err := d.Connect(cfg); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	t.Cleanup(func() { d.Disconnect() })

	if d.Ping() != nil {
		t.Error("Ping failed after successful Connect")
	}
}

func TestIntegration_Query_Select(t *testing.T) {
	d := connectOrFail(t)

	result, err := d.Query("SELECT 1 AS num")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("Query result error: %s", result.Error)
	}
	if len(result.Columns) != 1 || result.Columns[0] != "num" {
		t.Errorf("Columns = %v, want [num]", result.Columns)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(result.Rows))
	}
}

func TestIntegration_Query_ShowDatabases(t *testing.T) {
	d := connectOrFail(t)

	result, err := d.Query("SHOW DATABASES")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("Query result error: %s", result.Error)
	}
	if len(result.Rows) == 0 {
		t.Error("SHOW DATABASES returned no rows")
	}

	found := false
	for _, row := range result.Rows {
		if len(row) > 0 {
			if name, ok := row[0].(string); ok && strings.EqualFold(name, "mysql") {
				found = true
				break
			}
		}
	}
	if !found {
		t.Error("SHOW DATABASES did not include 'mysql' database")
	}
}

func TestIntegration_Query_Describe(t *testing.T) {
	d := connectOrFail(t)

	result, err := d.Query("DESCRIBE user")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("Query result error: %s", result.Error)
	}
	if len(result.Columns) == 0 {
		t.Error("DESCRIBE returned no columns")
	}
	if len(result.Rows) == 0 {
		t.Error("DESCRIBE returned no rows")
	}
}

func TestIntegration_Query_Insert(t *testing.T) {
	d := connectOrFail(t)

	_, err := d.Query("CREATE TEMPORARY TABLE _driver_test (id INT PRIMARY KEY, name VARCHAR(50))")
	if err != nil {
		t.Fatalf("CREATE TABLE error: %v", err)
	}

	result, err := d.Query("INSERT INTO _driver_test (id, name) VALUES (1, 'test')")
	if err != nil {
		t.Fatalf("INSERT error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("INSERT result error: %s", result.Error)
	}
	if result.RowsAffected != 1 {
		t.Errorf("RowsAffected = %d, want 1", result.RowsAffected)
	}
}

func TestIntegration_Ping(t *testing.T) {
	d := connectOrFail(t)

	if err := d.Ping(); err != nil {
		t.Errorf("Ping failed: %v", err)
	}
}

func TestIntegration_Disconnect(t *testing.T) {
	d := New()
	if err := d.Connect(testConfig()); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	if err := d.Disconnect(); err != nil {
		t.Errorf("Disconnect error: %v", err)
	}

	if err := d.Ping(); err == nil {
		t.Error("Ping should fail after Disconnect")
	}
}

func TestIntegration_Query_InvalidSQL(t *testing.T) {
	d := connectOrFail(t)

	result, err := d.Query("SELECT * FROM nonexistent_table_xyz")
	if err != nil {
		t.Fatalf("unexpected Go error: %v", err)
	}
	if result.Error == "" {
		t.Error("expected error for nonexistent table")
	}
}

func TestIntegration_InsertRow(t *testing.T) {
	d := connectOrFail(t)

	_, err := d.Query("CREATE TEMPORARY TABLE _insert_test (id INT PRIMARY KEY, val VARCHAR(50))")
	if err != nil {
		t.Fatalf("CREATE TABLE error: %v", err)
	}

	err = d.InsertRow("mysql", "_insert_test", map[string]interface{}{
		"id":  1,
		"val": "hello",
	})
	if err != nil {
		t.Fatalf("InsertRow error: %v", err)
	}

	result, err := d.Query("SELECT val FROM _insert_test WHERE id = 1")
	if err != nil {
		t.Fatalf("verify query error: %v", err)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(result.Rows))
	}
	if result.Rows[0][0] != "hello" {
		t.Errorf("val = %v, want 'hello'", result.Rows[0][0])
	}
}

func TestIntegration_UpdateRow(t *testing.T) {
	d := connectOrFail(t)

	_, err := d.Query("CREATE TEMPORARY TABLE _update_test (id INT PRIMARY KEY, val VARCHAR(50))")
	if err != nil {
		t.Fatalf("CREATE TABLE error: %v", err)
	}
	_, err = d.Query("INSERT INTO _update_test VALUES (1, 'old')")
	if err != nil {
		t.Fatalf("INSERT error: %v", err)
	}

	err = d.UpdateRow("mysql", "_update_test",
		map[string]interface{}{"id": 1},
		map[string]interface{}{"val": "new"},
	)
	if err != nil {
		t.Fatalf("UpdateRow error: %v", err)
	}

	result, err := d.Query("SELECT val FROM _update_test WHERE id = 1")
	if err != nil {
		t.Fatalf("verify query error: %v", err)
	}
	if result.Rows[0][0] != "new" {
		t.Errorf("val = %v, want 'new'", result.Rows[0][0])
	}
}

func TestIntegration_DeleteRow(t *testing.T) {
	d := connectOrFail(t)

	_, err := d.Query("CREATE TEMPORARY TABLE _delete_test (id INT PRIMARY KEY, val VARCHAR(50))")
	if err != nil {
		t.Fatalf("CREATE TABLE error: %v", err)
	}
	_, err = d.Query("INSERT INTO _delete_test VALUES (1, 'row')")
	if err != nil {
		t.Fatalf("INSERT error: %v", err)
	}

	err = d.DeleteRow("mysql", "_delete_test", map[string]interface{}{"id": 1})
	if err != nil {
		t.Fatalf("DeleteRow error: %v", err)
	}

	result, err := d.Query("SELECT COUNT(*) AS cnt FROM _delete_test")
	if err != nil {
		t.Fatalf("verify query error: %v", err)
	}
	if result.Rows[0][0] != int64(0) {
		t.Errorf("count = %v, want 0", result.Rows[0][0])
	}
}
