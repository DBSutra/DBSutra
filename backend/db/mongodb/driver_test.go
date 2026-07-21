// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mongodb

import (
	"clientdb/backend/db"
	"strings"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — no running MongoDB required
// ══════════════════════════════════════════════════════════════════════════════

func TestNew_ReturnsDriverWithCorrectType(t *testing.T) {
	d := New()
	if d == nil {
		t.Fatal("New() returned nil")
	}

	if d.Type() != "mongodb" {
		t.Errorf("Type() = %q, want %q", d.Type(), "mongodb")
	}

	// Verify it satisfies the db.Driver interface
	var _ db.Driver = d
}

func TestNew_ReturnsFreshInstance(t *testing.T) {
	d1 := New()
	d2 := New()
	if d1 == d2 {
		t.Error("New() should return distinct instances")
	}
}

func TestDisconnect_NilClient(t *testing.T) {
	d := New().(*Driver)
	// Disconnect on a fresh driver (no prior Connect) should not panic
	err := d.Disconnect()
	if err != nil {
		t.Errorf("Disconnect() on fresh driver returned error: %v", err)
	}
}

func TestQuery_EmptyString(t *testing.T) {
	d := New()
	result, err := d.Query("")
	if err != nil {
		t.Fatalf("Query(\"\") returned unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("Query(\"\") returned nil result")
	}
	if result.Error != "empty query" {
		t.Errorf("Query(\"\") error = %q, want %q", result.Error, "empty query")
	}
}

func TestQuery_WhitespaceOnly(t *testing.T) {
	d := New()
	result, err := d.Query("   \t\n  ")
	if err != nil {
		t.Fatalf("Query(whitespace) returned unexpected error: %v", err)
	}
	if result.Error != "empty query" {
		t.Errorf("Query(whitespace) error = %q, want %q", result.Error, "empty query")
	}
}

func TestQuery_UnsupportedSQLFormat(t *testing.T) {
	d := New()
	queries := []string{
		"SELECT * FROM users",
		"SHOW DATABASES",
		"INSERT INTO foo VALUES (1)",
	}
	for _, q := range queries {
		result, err := d.Query(q)
		if err != nil {
			t.Errorf("Query(%q) returned unexpected error: %v", q, err)
			continue
		}
		if !strings.Contains(result.Error, "unsupported MongoDB query format") {
			t.Errorf("Query(%q) error = %q, want it to contain %q", q, result.Error, "unsupported MongoDB query format")
		}
	}
}

func TestQuery_DbPrefixInvalidCommand(t *testing.T) {
	d := New()
	// "db." with no collection or method — should parse as invalid
	result, err := d.Query("db.")
	if err != nil {
		t.Fatalf("Query(\"db.\") returned unexpected error: %v", err)
	}
	if result.Error != "invalid MongoDB command" {
		t.Errorf("Query(\"db.\") error = %q, want %q", result.Error, "invalid MongoDB command")
	}
}

func TestQuery_DbPrefixUnsupportedOperation(t *testing.T) {
	d := New()
	result, err := d.Query("db.users.distinct(\"name\")")
	if err != nil {
		t.Fatalf("Query returned unexpected error: %v", err)
	}
	if !strings.Contains(result.Error, "unsupported MongoDB operation") {
		t.Errorf("error = %q, want it to contain %q", result.Error, "unsupported MongoDB operation")
	}
}

func TestMongoCoerceValue(t *testing.T) {
	tests := []struct {
		name string
		key  string
		val  interface{}
		want interface{}
	}{
		{"true string", "flag", "true", true},
		{"false string", "flag", "false", false},
		{"null string", "field", "null", nil},
		{"nil string", "field", "nil", nil},
		{"plain string", "name", "alice", "alice"},
		{"empty string", "name", "", ""},
		{"non-string int", "count", 42, 42},
		{"non-string bool", "flag", true, true},
		{"non-string nil", "field", nil, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mongoCoerceValue(tt.key, tt.val)
			if got != tt.want {
				t.Errorf("mongoCoerceValue(%q, %v) = %v, want %v", tt.key, tt.val, got, tt.want)
			}
		})
	}
}

func TestExtractParenContent(t *testing.T) {
	d := New().(*Driver)
	tests := []struct {
		input string
		want  string
	}{
		{"find({\"name\":\"alice\"})", "{\"name\":\"alice\"}"},
		{"find()", ""},
		{"find(  {\"x\":1}  )", "{\"x\":1}"},
		{"no_parens", ""},
	}
	for _, tt := range tests {
		got := d.extractParenContent(tt.input)
		if got != tt.want {
			t.Errorf("extractParenContent(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestExtractJSON(t *testing.T) {
	d := New().(*Driver)
	tests := []struct {
		input string
		want  string
	}{
		{"insertOne({\"name\":\"bob\"})", "{\"name\":\"bob\"}"},
		{"insertOne()", ""},
		{"no_parens", ""},
	}
	for _, tt := range tests {
		got := d.extractJSON(tt.input)
		if got != tt.want {
			t.Errorf("extractJSON(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestExtractJSONArray(t *testing.T) {
	d := New().(*Driver)
	tests := []struct {
		input string
		want  string
	}{
		{"insertMany([{\"a\":1},{\"a\":2}])", "[{\"a\":1},{\"a\":2}]"},
		{"no_brackets", ""},
	}
	for _, tt := range tests {
		got := d.extractJSONArray(tt.input)
		if got != tt.want {
			t.Errorf("extractJSONArray(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestExtractMethod_NoMatch(t *testing.T) {
	d := New().(*Driver)
	// When the method is not present in the input, extractMethod returns ""
	tests := []struct {
		rest   string
		method string
	}{
		{"find({})", "sort"},
		{"find({})", "limit"},
		{"find({})", "skip"},
	}
	for _, tt := range tests {
		got := d.extractMethod(tt.rest, tt.method)
		if got != "" {
			t.Errorf("extractMethod(%q, %q) = %q, want %q", tt.rest, tt.method, got, "")
		}
	}
}

