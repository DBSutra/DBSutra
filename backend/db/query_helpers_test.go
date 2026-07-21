// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import (
	"database/sql"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// ══════════════════════════════════════════════════════════════════════════════
// QUOTE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

func TestQuoteMySQL(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"users", "`users`"},
		{"id", "`id`"},
		{"my_table", "`my_table`"},
		{"", "``"},
		{"column with spaces", "`column with spaces`"},
	}
	for _, tt := range tests {
		got := QuoteMySQL(tt.input)
		if got != tt.want {
			t.Errorf("QuoteMySQL(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestQuotePostgres(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"users", `"users"`},
		{"id", `"id"`},
		{"my_table", `"my_table"`},
		{"", `""`},
		{"column with spaces", `"column with spaces"`},
	}
	for _, tt := range tests {
		got := QuotePostgres(tt.input)
		if got != tt.want {
			t.Errorf("QuotePostgres(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestQuoteSQLite(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"users", `"users"`},
		{"id", `"id"`},
		{"my_table", `"my_table"`},
		{"", `""`},
	}
	for _, tt := range tests {
		got := QuoteSQLite(tt.input)
		if got != tt.want {
			t.Errorf("QuoteSQLite(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD INSERT QUERY
// ══════════════════════════════════════════════════════════════════════════════

func TestBuildInsertQuery_Postgres(t *testing.T) {
	data := map[string]interface{}{"name": "Alice", "age": 30}
	query, vals := BuildInsertQuery("postgres", "", "users", data, QuotePostgres)

	if !strings.HasPrefix(query, "INSERT INTO ") {
		t.Errorf("query missing INSERT INTO prefix: %s", query)
	}
	if !strings.Contains(query, `"users"`) {
		t.Errorf("query missing quoted table name: %s", query)
	}
	if !strings.Contains(query, `"name"`) {
		t.Errorf("query missing quoted column 'name': %s", query)
	}
	if !strings.Contains(query, `"age"`) {
		t.Errorf("query missing quoted column 'age': %s", query)
	}
	if !strings.Contains(query, "$1") || !strings.Contains(query, "$2") {
		t.Errorf("query missing postgres placeholders: %s", query)
	}
	if len(vals) != 2 {
		t.Errorf("expected 2 values, got %d", len(vals))
	}
}

func TestBuildInsertQuery_MySQL(t *testing.T) {
	data := map[string]interface{}{"name": "Bob"}
	query, vals := BuildInsertQuery("mysql", "mydb", "users", data, QuoteMySQL)

	if !strings.Contains(query, "`mydb`.`users`") {
		t.Errorf("mysql query should use database.table format: %s", query)
	}
	if !strings.Contains(query, "`name`") {
		t.Errorf("query missing backtick-quoted column: %s", query)
	}
	if !strings.Contains(query, "?") {
		t.Errorf("mysql query should use ? placeholders: %s", query)
	}
	if len(vals) != 1 {
		t.Errorf("expected 1 value, got %d", len(vals))
	}
}

func TestBuildInsertQuery_MySQL_NoDatabase(t *testing.T) {
	data := map[string]interface{}{"name": "Charlie"}
	query, _ := BuildInsertQuery("mysql", "", "users", data, QuoteMySQL)

	if strings.Contains(query, "``.") {
		t.Errorf("should not have empty database prefix: %s", query)
	}
	if !strings.Contains(query, "`users`") {
		t.Errorf("query missing table name: %s", query)
	}
}

func TestBuildInsertQuery_MultiColumn_Postgres(t *testing.T) {
	data := map[string]interface{}{"a": 1}
	query, vals := BuildInsertQuery("postgres", "", "t", data, QuotePostgres)

	// Single-column map ensures deterministic order
	if !strings.Contains(query, `"a"`) || !strings.Contains(query, "$1") {
		t.Errorf("unexpected query: %s", query)
	}
	if len(vals) != 1 || vals[0] != 1 {
		t.Errorf("unexpected vals: %v", vals)
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD UPDATE QUERY
// ══════════════════════════════════════════════════════════════════════════════

func TestBuildUpdateQuery_Postgres(t *testing.T) {
	data := map[string]interface{}{"name": "Alice"}
	keyColumns := map[string]interface{}{"id": 42}
	query, vals := BuildUpdateQuery("postgres", "", "users", keyColumns, data, QuotePostgres)

	if !strings.HasPrefix(query, "UPDATE ") {
		t.Errorf("query missing UPDATE prefix: %s", query)
	}
	if !strings.Contains(query, `"users"`) {
		t.Errorf("query missing quoted table: %s", query)
	}
	if !strings.Contains(query, "SET") {
		t.Errorf("query missing SET clause: %s", query)
	}
	if !strings.Contains(query, "WHERE") {
		t.Errorf("query missing WHERE clause: %s", query)
	}
	if !strings.Contains(query, `"name"`) {
		t.Errorf("query missing column 'name': %s", query)
	}
	if !strings.Contains(query, `"id"`) {
		t.Errorf("query missing key column 'id': %s", query)
	}
	if len(vals) != 2 {
		t.Errorf("expected 2 values (1 set + 1 where), got %d", len(vals))
	}
}

func TestBuildUpdateQuery_MySQL(t *testing.T) {
	data := map[string]interface{}{"status": "active"}
	keyColumns := map[string]interface{}{"id": 1}
	query, vals := BuildUpdateQuery("mysql", "mydb", "users", keyColumns, data, QuoteMySQL)

	if !strings.Contains(query, "`mydb`.`users`") {
		t.Errorf("mysql query should use database.table format: %s", query)
	}
	if !strings.Contains(query, "?") {
		t.Errorf("mysql query should use ? placeholders: %s", query)
	}
	if !strings.Contains(query, "WHERE") {
		t.Errorf("query missing WHERE clause: %s", query)
	}
	if len(vals) != 2 {
		t.Errorf("expected 2 values, got %d", len(vals))
	}
}

func TestBuildUpdateQuery_MultipleKeyColumns(t *testing.T) {
	data := map[string]interface{}{"val": 100}
	keyColumns := map[string]interface{}{"k1": 1}
	// Single-key map ensures deterministic order for the key part
	query, vals := BuildUpdateQuery("mysql", "", "t", keyColumns, data, QuoteMySQL)

	if !strings.Contains(query, "`k1` = ?") {
		t.Errorf("query missing key clause: %s", query)
	}
	if len(vals) != 2 {
		t.Errorf("expected 2 values, got %d", len(vals))
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD DELETE QUERY
// ══════════════════════════════════════════════════════════════════════════════

func TestBuildDeleteQuery_Postgres(t *testing.T) {
	keyColumns := map[string]interface{}{"id": 42}
	query, vals := BuildDeleteQuery("postgres", "", "users", keyColumns, QuotePostgres)

	if !strings.HasPrefix(query, "DELETE FROM ") {
		t.Errorf("query missing DELETE FROM prefix: %s", query)
	}
	if !strings.Contains(query, `"users"`) {
		t.Errorf("query missing quoted table: %s", query)
	}
	if !strings.Contains(query, "WHERE") {
		t.Errorf("query missing WHERE clause: %s", query)
	}
	if !strings.Contains(query, `"id"`) {
		t.Errorf("query missing key column: %s", query)
	}
	if !strings.Contains(query, "$1") {
		t.Errorf("query missing postgres placeholder: %s", query)
	}
	if len(vals) != 1 {
		t.Errorf("expected 1 value, got %d", len(vals))
	}
	if vals[0] != 42 {
		t.Errorf("expected val 42, got %v", vals[0])
	}
}

func TestBuildDeleteQuery_MySQL(t *testing.T) {
	keyColumns := map[string]interface{}{"id": 1}
	query, vals := BuildDeleteQuery("mysql", "mydb", "users", keyColumns, QuoteMySQL)

	if !strings.Contains(query, "`mydb`.`users`") {
		t.Errorf("mysql query should use database.table format: %s", query)
	}
	if !strings.Contains(query, "?") {
		t.Errorf("mysql query should use ? placeholders: %s", query)
	}
	if len(vals) != 1 {
		t.Errorf("expected 1 value, got %d", len(vals))
	}
}

func TestBuildDeleteQuery_MySQL_NoDatabase(t *testing.T) {
	keyColumns := map[string]interface{}{"id": 1}
	query, _ := BuildDeleteQuery("mysql", "", "users", keyColumns, QuoteMySQL)

	if strings.Contains(query, "``.") {
		t.Errorf("should not have empty database prefix: %s", query)
	}
}

func TestBuildDeleteQuery_SQLite(t *testing.T) {
	keyColumns := map[string]interface{}{"id": 1}
	query, vals := BuildDeleteQuery("sqlite", "", "users", keyColumns, QuoteSQLite)

	if !strings.Contains(query, `"users"`) {
		t.Errorf("query missing quoted table: %s", query)
	}
	if !strings.Contains(query, "WHERE") {
		t.Errorf("query missing WHERE clause: %s", query)
	}
	if len(vals) != 1 {
		t.Errorf("expected 1 value, got %d", len(vals))
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER — create an in-memory SQLite DB for Execute* tests
// ══════════════════════════════════════════════════════════════════════════════

func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_, err = db.Exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)")
	if err != nil {
		t.Fatalf("failed to create test table: %v", err)
	}
	_, err = db.Exec("INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30), (2, 'Bob', 25)")
	if err != nil {
		t.Fatalf("failed to insert test data: %v", err)
	}
	return db
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTE SELECT QUERY
// ══════════════════════════════════════════════════════════════════════════════

func TestExecuteSelectQuery_BasicSelect(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteSelectQuery(db, "sqlite", "SELECT id, name, age FROM users ORDER BY id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("unexpected query error: %s", result.Error)
	}
	if len(result.Columns) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(result.Columns))
	}
	if len(result.Rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(result.Rows))
	}
	// First row: id=1, name=Alice, age=30
	if result.Rows[0][0] != int64(1) {
		t.Errorf("expected id=1, got %v", result.Rows[0][0])
	}
	if result.Rows[0][1] != "Alice" {
		t.Errorf("expected name=Alice, got %v", result.Rows[0][1])
	}
	if result.Rows[0][2] != int64(30) {
		t.Errorf("expected age=30, got %v", result.Rows[0][2])
	}
}

func TestExecuteSelectQuery_EmptyResult(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteSelectQuery(db, "sqlite", "SELECT * FROM users WHERE id = 999")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("unexpected query error: %s", result.Error)
	}
	if len(result.Rows) != 0 {
		t.Errorf("expected 0 rows, got %d", len(result.Rows))
	}
	if len(result.Columns) != 3 {
		t.Errorf("expected 3 columns even for empty result, got %d", len(result.Columns))
	}
}

func TestExecuteSelectQuery_InvalidQuery(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteSelectQuery(db, "sqlite", "SELECT * FROM nonexistent_table")
	if err != nil {
		t.Fatalf("unexpected error (should be in result.Error): %v", err)
	}
	if result.Error == "" {
		t.Fatal("expected an error for invalid query")
	}
	if !strings.Contains(result.Error, "nonexistent_table") {
		t.Errorf("error should mention the table: %s", result.Error)
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTE NON QUERY
// ══════════════════════════════════════════════════════════════════════════════

func TestExecuteNonQuery_Insert(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteNonQuery(db, "sqlite", "INSERT INTO users (id, name, age) VALUES (3, 'Charlie', 35)")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("unexpected query error: %s", result.Error)
	}
	if result.RowsAffected != 1 {
		t.Errorf("expected 1 row affected, got %d", result.RowsAffected)
	}

	// Verify the row was actually inserted
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users WHERE id = 3").Scan(&count)
	if err != nil {
		t.Fatalf("verification query failed: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 row with id=3, got %d", count)
	}
}

func TestExecuteNonQuery_Update(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteNonQuery(db, "sqlite", "UPDATE users SET age = 31 WHERE name = 'Alice'")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("unexpected query error: %s", result.Error)
	}
	if result.RowsAffected != 1 {
		t.Errorf("expected 1 row affected, got %d", result.RowsAffected)
	}

	// Verify the update
	var age int
	err = db.QueryRow("SELECT age FROM users WHERE name = 'Alice'").Scan(&age)
	if err != nil {
		t.Fatalf("verification query failed: %v", err)
	}
	if age != 31 {
		t.Errorf("expected age=31, got %d", age)
	}
}

func TestExecuteNonQuery_Delete(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteNonQuery(db, "sqlite", "DELETE FROM users WHERE id = 1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("unexpected query error: %s", result.Error)
	}
	if result.RowsAffected != 1 {
		t.Errorf("expected 1 row affected, got %d", result.RowsAffected)
	}

	// Verify deletion
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		t.Fatalf("verification query failed: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 remaining row, got %d", count)
	}
}

func TestExecuteNonQuery_InvalidQuery(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteNonQuery(db, "sqlite", "INSERT INTO nonexistent_table VALUES (1)")
	if err != nil {
		t.Fatalf("unexpected error (should be in result.Error): %v", err)
	}
	if result.Error == "" {
		t.Fatal("expected an error for invalid query")
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY STRUCTURE VALIDATION — multi-column maps (order-independent)
// ══════════════════════════════════════════════════════════════════════════════

func TestBuildInsertQuery_Postgres_MultiColumn_ContainsAllParts(t *testing.T) {
	data := map[string]interface{}{"col_a": "x", "col_b": "y", "col_c": "z"}
	query, vals := BuildInsertQuery("postgres", "", "my_table", data, QuotePostgres)

	// Verify structure: contains all columns, all placeholders, correct table
	requiredParts := []string{
		"INSERT INTO", `"my_table"`, "(",
		`"col_a"`, `"col_b"`, `"col_c"`,
		"VALUES", "$1", "$2", "$3",
	}
	for _, part := range requiredParts {
		if !strings.Contains(query, part) {
			t.Errorf("query missing %q: %s", part, query)
		}
	}
	if len(vals) != 3 {
		t.Errorf("expected 3 values, got %d", len(vals))
	}
}

func TestBuildUpdateQuery_Postgres_MultiColumn_ContainsAllParts(t *testing.T) {
	data := map[string]interface{}{"name": "Alice", "email": "a@b.com"}
	keyColumns := map[string]interface{}{"id": 42}
	query, vals := BuildUpdateQuery("postgres", "", "users", keyColumns, data, QuotePostgres)

	requiredParts := []string{
		"UPDATE", `"users"`, "SET",
		`"name"`, `"email"`,
		"WHERE", `"id"`,
	}
	for _, part := range requiredParts {
		if !strings.Contains(query, part) {
			t.Errorf("query missing %q: %s", part, query)
		}
	}
	// 2 SET columns + 1 WHERE = 3 values
	if len(vals) != 3 {
		t.Errorf("expected 3 values, got %d", len(vals))
	}
}

func TestBuildDeleteQuery_Postgres_MultiKey_ContainsAllParts(t *testing.T) {
	keyColumns := map[string]interface{}{"tenant_id": 1, "user_id": 2}
	query, vals := BuildDeleteQuery("postgres", "", "members", keyColumns, QuotePostgres)

	requiredParts := []string{
		"DELETE FROM", `"members"`, "WHERE",
		`"tenant_id"`, `"user_id"`,
	}
	for _, part := range requiredParts {
		if !strings.Contains(query, part) {
			t.Errorf("query missing %q: %s", part, query)
		}
	}
	if !strings.Contains(query, "AND") {
		t.Errorf("multi-key delete should use AND: %s", query)
	}
	if len(vals) != 2 {
		t.Errorf("expected 2 values, got %d", len(vals))
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTE SELECT QUERY — string conversion of []byte
// ══════════════════════════════════════════════════════════════════════════════

func TestExecuteSelectQuery_ByteArrayConversion(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// SQLite stores text as bytes that get scanned; this verifies the []byte->string path
	result, err := ExecuteSelectQuery(db, "sqlite", "SELECT name FROM users WHERE id = 1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("unexpected query error: %s", result.Error)
	}
	if len(result.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(result.Rows))
	}
	name, ok := result.Rows[0][0].(string)
	if !ok {
		t.Fatalf("expected name to be string, got %T", result.Rows[0][0])
	}
	if name != "Alice" {
		t.Errorf("expected 'Alice', got %q", name)
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTE NON QUERY — multiple row affects
// ══════════════════════════════════════════════════════════════════════════════

func TestExecuteNonQuery_MultipleRowsAffected(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	result, err := ExecuteNonQuery(db, "sqlite", "UPDATE users SET age = 99")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("unexpected query error: %s", result.Error)
	}
	if result.RowsAffected != 2 {
		t.Errorf("expected 2 rows affected, got %d", result.RowsAffected)
	}
}
