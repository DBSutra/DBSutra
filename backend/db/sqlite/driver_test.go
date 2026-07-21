// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package sqlite

import (
	"os"
	"path/filepath"
	"testing"

	"clientdb/backend/db"
)

// helper: connect to in-memory DB and create a test table
func connectMem(t *testing.T) *Driver {
	t.Helper()
	d := New()
	if err := d.Connect(db.ConnectionConfig{Type: "sqlite", Database: ":memory:"}); err != nil {
		t.Fatalf("connect :memory: failed: %v", err)
	}
	_, err := d.(*Driver).d.Exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age INTEGER)")
	if err != nil {
		t.Fatalf("create table failed: %v", err)
	}
	return d.(*Driver)
}

// ── 1. New returns Driver with correct Type ──────────────────────────────────

func TestNewReturnsDriverWithType(t *testing.T) {
	d := New()
	if d == nil {
		t.Fatal("New() returned nil")
	}
	if d.Type() != "sqlite" {
		t.Errorf("Type() = %q, want %q", d.Type(), "sqlite")
	}
}

// ── 2. Connect with in-memory SQLite succeeds ────────────────────────────────

func TestConnectInMemory(t *testing.T) {
	d := New()
	err := d.Connect(db.ConnectionConfig{Type: "sqlite", Database: ":memory:"})
	if err != nil {
		t.Fatalf("Connect(:memory:) error: %v", err)
	}
	defer d.Disconnect()
}

// ── 3. Connect with file-based SQLite succeeds ──────────────────────────────

func TestConnectFileBased(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")

	d := New()
	err := d.Connect(db.ConnectionConfig{Type: "sqlite", Database: path})
	if err != nil {
		t.Fatalf("Connect(%s) error: %v", path, err)
	}
	defer d.Disconnect()

	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("database file not created at %s", path)
	}
}

// ── 4. Query SELECT returns results ─────────────────────────────────────────

func TestQuerySelectReturnsResults(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	// insert a known row
	_, err := d.d.Exec("INSERT INTO users (name, age) VALUES ('Alice', 30)")
	if err != nil {
		t.Fatalf("seed insert failed: %v", err)
	}

	res, err := d.Query("SELECT name, age FROM users WHERE name = 'Alice'")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("Query returned error field: %s", res.Error)
	}
	if len(res.Columns) != 2 {
		t.Fatalf("Columns len = %d, want 2", len(res.Columns))
	}
	if len(res.Rows) != 1 {
		t.Fatalf("Rows len = %d, want 1", len(res.Rows))
	}
	name, _ := res.Rows[0][0].(string)
	if name != "Alice" {
		t.Errorf("name = %q, want %q", name, "Alice")
	}
}

// ── 5. Query INSERT returns rowsAffected ─────────────────────────────────────

func TestQueryInsertRowsAffected(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	res, err := d.Query("INSERT INTO users (name, age) VALUES ('Bob', 25)")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("Query returned error field: %s", res.Error)
	}
	if res.RowsAffected != 1 {
		t.Errorf("RowsAffected = %d, want 1", res.RowsAffected)
	}
}

// ── 6. Query with empty string returns error ─────────────────────────────────

func TestQueryEmptyStringReturnsError(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	res, err := d.Query("")
	if err != nil {
		t.Fatalf("unexpected Go error: %v", err)
	}
	if res.Error == "" {
		t.Fatal("expected non-empty Error field for empty query")
	}
}

// ── 7. GetSchema returns database and table info ─────────────────────────────

func TestGetSchemaReturnsInfo(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("GetSchema error: %v", err)
	}
	if len(schema) == 0 {
		t.Fatal("schema is empty")
	}

	db0 := schema[0]
	if db0.Name == "" {
		t.Error("database name is empty")
	}

	// we created the "users" table
	found := false
	for _, tbl := range db0.Tables {
		if tbl.Name == "users" {
			found = true
			if len(tbl.Columns) == 0 {
				t.Error("users table has no columns")
			}
			break
		}
	}
	if !found {
		t.Error("users table not found in schema")
	}
}

// ── 8. Disconnect closes connection ─────────────────────────────────────────

func TestDisconnectClosesConnection(t *testing.T) {
	d := connectMem(t)

	if err := d.Disconnect(); err != nil {
		t.Fatalf("Disconnect error: %v", err)
	}

	// ping should fail after disconnect
	err := d.Ping()
	if err == nil {
		t.Fatal("Ping succeeded after Disconnect, want error")
	}
}

// ── 9. Ping succeeds on open connection ──────────────────────────────────────

func TestPingSucceeds(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	if err := d.Ping(); err != nil {
		t.Fatalf("Ping error: %v", err)
	}
}

// ── 10. InsertRow adds data ─────────────────────────────────────────────────

func TestInsertRowAddsData(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	err := d.InsertRow("", "users", map[string]interface{}{
		"name": "Charlie",
		"age":  22,
	})
	if err != nil {
		t.Fatalf("InsertRow error: %v", err)
	}

	res, qErr := d.Query("SELECT name FROM users WHERE name = 'Charlie'")
	if qErr != nil {
		t.Fatalf("verify query error: %v", qErr)
	}
	if len(res.Rows) != 1 {
		t.Fatalf("expected 1 row for Charlie, got %d", len(res.Rows))
	}
}

// ── 11. UpdateRow modifies data ─────────────────────────────────────────────

func TestUpdateRowModifiesData(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	// seed
	_, err := d.d.Exec("INSERT INTO users (name, age) VALUES ('Dave', 40)")
	if err != nil {
		t.Fatalf("seed failed: %v", err)
	}

	err = d.UpdateRow("", "users",
		map[string]interface{}{"name": "Dave"},
		map[string]interface{}{"age": 41},
	)
	if err != nil {
		t.Fatalf("UpdateRow error: %v", err)
	}

	res, qErr := d.Query("SELECT age FROM users WHERE name = 'Dave'")
	if qErr != nil {
		t.Fatalf("verify query error: %v", qErr)
	}
	if len(res.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(res.Rows))
	}
	// SQLite may return int64
	age := res.Rows[0][0]
	switch v := age.(type) {
	case int64:
		if v != 41 {
			t.Errorf("age = %d, want 41", v)
		}
	default:
		t.Errorf("unexpected age type %T: %v", age, age)
	}
}

// ── 12. DeleteRow removes data ──────────────────────────────────────────────

func TestDeleteRowRemovesData(t *testing.T) {
	d := connectMem(t)
	defer d.Disconnect()

	// seed
	_, err := d.d.Exec("INSERT INTO users (name, age) VALUES ('Eve', 35)")
	if err != nil {
		t.Fatalf("seed failed: %v", err)
	}

	err = d.DeleteRow("", "users", map[string]interface{}{"name": "Eve"})
	if err != nil {
		t.Fatalf("DeleteRow error: %v", err)
	}

	res, qErr := d.Query("SELECT * FROM users WHERE name = 'Eve'")
	if qErr != nil {
		t.Fatalf("verify query error: %v", qErr)
	}
	if len(res.Rows) != 0 {
		t.Errorf("expected 0 rows after delete, got %d", len(res.Rows))
	}
}

// ── 13. Connect with invalid path returns error ─────────────────────────────

func TestConnectInvalidPathReturnsError(t *testing.T) {
	d := New()
	err := d.Connect(db.ConnectionConfig{
		Type:     "sqlite",
		Database: "/nonexistent/deeply/nested/path/db.sqlite",
	})
	if err == nil {
		d.Disconnect()
		t.Fatal("expected error for invalid path, got nil")
	}
}
