// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package elasticsearch

import (
	"clientdb/backend/db"
	"strings"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — no Elasticsearch instance required
// ══════════════════════════════════════════════════════════════════════════════

func TestNew_ReturnsDriver(t *testing.T) {
	d := New()
	if d == nil {
		t.Fatal("New() returned nil")
	}
}

func TestType_ReturnsElasticsearch(t *testing.T) {
	d := New()
	if got := d.Type(); got != "elasticsearch" {
		t.Errorf("Type() = %q, want %q", got, "elasticsearch")
	}
}

func TestNew_ImplementsDriverInterface(t *testing.T) {
	var _ db.Driver = New()
}

func TestConnect_UnreachableHost(t *testing.T) {
	d := New()
	cfg := db.ConnectionConfig{
		Host: "127.0.0.1",
		Port: 1, // privileged port — nothing listens here
	}
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("Connect to unreachable host should return error")
	}
	if !strings.Contains(err.Error(), "elasticsearch") {
		t.Errorf("error should mention elasticsearch, got: %v", err)
	}
}

func TestConnect_DefaultHostAndPort(t *testing.T) {
	// Empty host defaults to 127.0.0.1:9200, which will fail if no local ES.
	// We just verify it doesn't panic and returns a reasonable error.
	d := New()
	cfg := db.ConnectionConfig{}
	err := d.Connect(cfg)
	if err == nil {
		t.Skip("local Elasticsearch is running; default-connect succeeded")
	}
}

func TestConnect_WithConnectionString(t *testing.T) {
	d := New()
	cfg := db.ConnectionConfig{
		ConnectionString: "http://127.0.0.1:1",
	}
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("Connect with bad connection string should return error")
	}
}

func TestPing_NotConnected(t *testing.T) {
	d := New()
	err := d.Ping()
	if err == nil {
		t.Fatal("Ping on disconnected driver should return error")
	}
	if err.Error() != "not connected" {
		t.Errorf("Ping error = %q, want %q", err.Error(), "not connected")
	}
}

func TestDisconnect_NotConnected(t *testing.T) {
	d := New()
	err := d.Disconnect()
	if err != nil {
		t.Errorf("Disconnect on nil client should not error, got: %v", err)
	}
}

func TestUpdateRow_MissingID(t *testing.T) {
	d := New()
	err := d.UpdateRow("db", "index", map[string]interface{}{"foo": "bar"}, map[string]interface{}{"field": "val"})
	if err == nil {
		t.Fatal("UpdateRow without _id should return error")
	}
	if !strings.Contains(err.Error(), "_id") {
		t.Errorf("error should mention _id, got: %v", err)
	}
}

func TestDeleteRow_MissingID(t *testing.T) {
	d := New()
	err := d.DeleteRow("db", "index", map[string]interface{}{"foo": "bar"})
	if err == nil {
		t.Fatal("DeleteRow without _id should return error")
	}
	if !strings.Contains(err.Error(), "_id") {
		t.Errorf("error should mention _id, got: %v", err)
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
	result, err := d.Query("   \t  ")
	if err != nil {
		t.Fatalf("Query(whitespace) returned unexpected error: %v", err)
	}
	if result.Error != "empty query" {
		t.Errorf("Query(whitespace) error = %q, want %q", result.Error, "empty query")
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY DISPATCH TESTS — verify command routing without a live connection.
// Each command handler hits the nil client, so we just confirm the dispatch
// reaches the handler (nil-pointer panic) rather than returning a parse error.
// ══════════════════════════════════════════════════════════════════════════════

func TestQuery_DispatchPanicsOnNilClient(t *testing.T) {
	commands := []string{
		"SEARCH",
		"GET myindex",
		"INDEX myindex {}",
		"DELETE myindex/doc1",
		"COUNT",
		"CAT",
		"CLUSTER",
		"INFO",
		"PING",
		"MAPPING myindex",
		"BULK {}",
		"myindex",
	}

	for _, cmd := range commands {
		t.Run(cmd, func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Errorf("command %q should panic on nil client (handler was not reached)", cmd)
				}
			}()
			d := New()
			_, _ = d.Query(cmd)
		})
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY ARGUMENT PARSING TESTS — verify the split between command and argument
// ══════════════════════════════════════════════════════════════════════════════

func TestQuery_SearchDefaultIndex(t *testing.T) {
	// SEARCH with no args should use _all index and match_all.
	// We capture the panic to confirm handleSearch was reached.
	d := New()
	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic from nil client")
		}
	}()
	_, _ = d.Query("SEARCH")
}

func TestQuery_SearchWithIndex(t *testing.T) {
	d := New()
	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic from nil client")
		}
	}()
	_, _ = d.Query(`SEARCH myindex {"query":{"match":{}}}`)
}

func TestQuery_GetWithoutArg(t *testing.T) {
	// GET with no argument should return an error result, not panic.
	d := New()
	result, err := d.Query("GET")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "GET requires an index or index/id" {
		t.Errorf("GET without arg error = %q, want %q", result.Error, "GET requires an index or index/id")
	}
}

func TestQuery_IndexWithoutBody(t *testing.T) {
	d := New()
	result, err := d.Query("INDEX myindex")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "INDEX requires index_name and JSON document" {
		t.Errorf("INDEX without body error = %q", result.Error)
	}
}

func TestQuery_DeleteWithoutArg(t *testing.T) {
	d := New()
	result, err := d.Query("DELETE")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "DELETE requires index/id" {
		t.Errorf("DELETE without arg error = %q", result.Error)
	}
}

func TestQuery_MappingWithoutArg(t *testing.T) {
	d := New()
	result, err := d.Query("MAPPING")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "MAPPING requires an index name" {
		t.Errorf("MAPPING without arg error = %q", result.Error)
	}
}

func TestQuery_BulkWithoutArg(t *testing.T) {
	d := New()
	result, err := d.Query("BULK")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "BULK requires NDJSON body" {
		t.Errorf("BULK without arg error = %q", result.Error)
	}
}

func TestQuery_UnsupportedCatTarget(t *testing.T) {
	d := New()
	result, err := d.Query("CAT foobar")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Error != "unsupported CAT target: foobar" {
		t.Errorf("CAT foobar error = %q", result.Error)
	}
}
