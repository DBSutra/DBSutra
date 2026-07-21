// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build integration

package elasticsearch

import (
	"clientdb/backend/db"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — require a running Elasticsearch instance on localhost:9200
// Run with:  go test -tags integration ./backend/db/elasticsearch/
// ══════════════════════════════════════════════════════════════════════════════

func TestIntegration_ConnectAndPing(t *testing.T) {
	d := New()
	cfg := db.ConnectionConfig{
		Host: "127.0.0.1",
		Port: 9200,
	}
	if err := d.Connect(cfg); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer d.Disconnect()

	if err := d.Ping(); err != nil {
		t.Fatalf("Ping failed: %v", err)
	}
}

func TestIntegration_GetSchema(t *testing.T) {
	d := connectOrFail(t)
	defer d.Disconnect()

	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("GetSchema failed: %v", err)
	}
	if len(schema) == 0 {
		t.Fatal("GetSchema returned empty schema")
	}
	if schema[0].Name == "" {
		t.Error("schema database name is empty")
	}
}

func TestIntegration_InsertAndSearch(t *testing.T) {
	indexName := "test_driver_integration"
	d := connectOrFail(t)
	defer d.Disconnect()

	// Insert a document.
	err := d.InsertRow("", indexName, map[string]interface{}{
		"name":  "test",
		"value": 42,
	})
	if err != nil {
		t.Fatalf("InsertRow failed: %v", err)
	}

	// Search for it.
	result, err := d.Query("SEARCH " + indexName)
	if err != nil {
		t.Fatalf("Query SEARCH failed: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("SEARCH returned error: %s", result.Error)
	}
	if len(result.Rows) == 0 {
		t.Fatal("SEARCH returned no rows")
	}

	// Cleanup.
	_, _ = d.Query("DELETE " + indexName)
}

func TestIntegration_Count(t *testing.T) {
	indexName := "test_driver_count"
	d := connectOrFail(t)
	defer d.Disconnect()

	_ = d.InsertRow("", indexName, map[string]interface{}{"key": "val"})

	result, err := d.Query("COUNT " + indexName)
	if err != nil {
		t.Fatalf("COUNT failed: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("COUNT returned error: %s", result.Error)
	}

	_, _ = d.Query("DELETE " + indexName)
}

func TestIntegration_CatIndices(t *testing.T) {
	d := connectOrFail(t)
	defer d.Disconnect()

	result, err := d.Query("CAT indices")
	if err != nil {
		t.Fatalf("CAT indices failed: %v", err)
	}
	if result.Error != "" {
		t.Fatalf("CAT returned error: %s", result.Error)
	}
}

func TestIntegration_UpdateAndDelete(t *testing.T) {
	indexName := "test_driver_crud"
	d := connectOrFail(t)
	defer d.Disconnect()

	// Insert.
	err := d.InsertRow("", indexName, map[string]interface{}{"status": "new"})
	if err != nil {
		t.Fatalf("InsertRow failed: %v", err)
	}

	// Search to get _id.
	searchRes, err := d.Query("SEARCH " + indexName)
	if err != nil || searchRes.Error != "" {
		t.Fatalf("SEARCH failed: %v / %s", err, searchRes.Error)
	}
	if len(searchRes.Rows) == 0 {
		t.Fatal("no rows after insert")
	}
	docID := searchRes.Rows[0][1].(string) // _id is column index 1

	// Update.
	err = d.UpdateRow("", indexName, map[string]interface{}{"_id": docID}, map[string]interface{}{"status": "updated"})
	if err != nil {
		t.Fatalf("UpdateRow failed: %v", err)
	}

	// Delete.
	err = d.DeleteRow("", indexName, map[string]interface{}{"_id": docID})
	if err != nil {
		t.Fatalf("DeleteRow failed: %v", err)
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

func connectOrFail(t *testing.T) *Driver {
	t.Helper()
	d := New().(*Driver)
	cfg := db.ConnectionConfig{
		Host: "127.0.0.1",
		Port: 9200,
	}
	if err := d.Connect(cfg); err != nil {
		t.Fatalf("connectOrFail: %v", err)
	}
	return d
}
