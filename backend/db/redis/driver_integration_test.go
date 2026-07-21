// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

//go:build integration

package redis

import (
	"strings"
	"testing"

	"clientdb/backend/db"
)

// getTestConfig returns connection config for the local Redis instance.
func getTestConfig() db.ConnectionConfig {
	return db.ConnectionConfig{
		Host: "127.0.0.1",
		Port: 6379,
	}
}

func connectOrFail(t *testing.T) *Driver {
	t.Helper()
	d := New().(*Driver)
	if err := d.Connect(getTestConfig()); err != nil {
		t.Fatalf("Connect failed (is Redis running?): %v", err)
	}
	t.Cleanup(func() { d.Disconnect() })
	return d
}

func TestIntegrationConnectAndPing(t *testing.T) {
	d := connectOrFail(t)
	if err := d.Ping(); err != nil {
		t.Errorf("Ping failed: %v", err)
	}
}

func TestIntegrationSetGetDel(t *testing.T) {
	d := connectOrFail(t)

	// SET
	res, err := d.Query("SET test_driver_key hello")
	if err != nil {
		t.Fatalf("SET error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("SET returned error: %s", res.Error)
	}

	// GET
	res, err = d.Query("GET test_driver_key")
	if err != nil {
		t.Fatalf("GET error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("GET returned error: %s", res.Error)
	}
	if len(res.Rows) != 1 || res.Rows[0][1] != "hello" {
		t.Errorf("GET result = %v, want [[test_driver_key hello]]", res.Rows)
	}

	// DEL
	res, err = d.Query("DEL test_driver_key")
	if err != nil {
		t.Fatalf("DEL error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("DEL returned error: %s", res.Error)
	}

	// Verify deleted
	res, err = d.Query("GET test_driver_key")
	if err != nil {
		t.Fatalf("GET after DEL error: %v", err)
	}
	if res.Error == "" {
		t.Error("GET after DEL should return an error (key does not exist)")
	}
}

func TestIntegrationHashOperations(t *testing.T) {
	d := connectOrFail(t)

	// HSET
	res, err := d.Query("HSET test_hash field1 value1")
	if err != nil {
		t.Fatalf("HSET error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("HSET returned error: %s", res.Error)
	}

	// HGET
	res, err = d.Query("HGET test_hash field1")
	if err != nil {
		t.Fatalf("HGET error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("HGET returned error: %s", res.Error)
	}
	if len(res.Rows) != 1 || res.Rows[0][1] != "value1" {
		t.Errorf("HGET result = %v, want [[field1 value1]]", res.Rows)
	}

	// HGETALL
	res, err = d.Query("HGETALL test_hash")
	if err != nil {
		t.Fatalf("HGETALL error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("HGETALL returned error: %s", res.Error)
	}
	if len(res.Rows) < 1 {
		t.Error("HGETALL returned no rows")
	}

	// Cleanup
	d.Query("DEL test_hash")
}

func TestIntegrationListOperations(t *testing.T) {
	d := connectOrFail(t)

	// LPUSH
	res, err := d.Query("LPUSH test_list item1")
	if err != nil {
		t.Fatalf("LPUSH error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("LPUSH returned error: %s", res.Error)
	}

	// RPUSH
	res, err = d.Query("RPUSH test_list item2")
	if err != nil {
		t.Fatalf("RPUSH error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("RPUSH returned error: %s", res.Error)
	}

	// LRANGE
	res, err = d.Query("LRANGE test_list 0 -1")
	if err != nil {
		t.Fatalf("LRANGE error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("LRANGE returned error: %s", res.Error)
	}
	if len(res.Rows) != 2 {
		t.Errorf("LRANGE returned %d rows, want 2", len(res.Rows))
	}

	// Cleanup
	d.Query("DEL test_list")
}

func TestIntegrationSetOperations(t *testing.T) {
	d := connectOrFail(t)

	// SADD
	res, err := d.Query("SADD test_set member1")
	if err != nil {
		t.Fatalf("SADD error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("SADD returned error: %s", res.Error)
	}

	// SMEMBERS
	res, err = d.Query("SMEMBERS test_set")
	if err != nil {
		t.Fatalf("SMEMBERS error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("SMEMBERS returned error: %s", res.Error)
	}
	if len(res.Rows) != 1 {
		t.Errorf("SMEMBERS returned %d rows, want 1", len(res.Rows))
	}

	// Cleanup
	d.Query("DEL test_set")
}

func TestIntegrationKeyHelpers(t *testing.T) {
	d := connectOrFail(t)

	d.Query("SET test_helpers_key value")

	// TYPE
	res, err := d.Query("TYPE test_helpers_key")
	if err != nil {
		t.Fatalf("TYPE error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("TYPE returned error: %s", res.Error)
	}

	// EXISTS
	res, err = d.Query("EXISTS test_helpers_key")
	if err != nil {
		t.Fatalf("EXISTS error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("EXISTS returned error: %s", res.Error)
	}

	// TTL
	res, err = d.Query("TTL test_helpers_key")
	if err != nil {
		t.Fatalf("TTL error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("TTL returned error: %s", res.Error)
	}

	// Cleanup
	d.Query("DEL test_helpers_key")
}

func TestIntegrationIncrDecr(t *testing.T) {
	d := connectOrFail(t)

	d.Query("SET test_counter 10")

	// INCR
	res, err := d.Query("INCR test_counter")
	if err != nil {
		t.Fatalf("INCR error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("INCR returned error: %s", res.Error)
	}

	// DECR
	res, err = d.Query("DECR test_counter")
	if err != nil {
		t.Fatalf("DECR error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("DECR returned error: %s", res.Error)
	}

	// INCRBY
	res, err = d.Query("INCRBY test_counter 5")
	if err != nil {
		t.Fatalf("INCRBY error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("INCRBY returned error: %s", res.Error)
	}

	// DECRBY
	res, err = d.Query("DECRBY test_counter 3")
	if err != nil {
		t.Fatalf("DECRBY error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("DECRBY returned error: %s", res.Error)
	}

	// Cleanup
	d.Query("DEL test_counter")
}

func TestIntegrationInsertUpdateDeleteRow(t *testing.T) {
	d := connectOrFail(t)

	// InsertRow
	err := d.InsertRow("", "test_table", map[string]interface{}{"key": "test_row_key", "value": "hello"})
	if err != nil {
		t.Fatalf("InsertRow error: %v", err)
	}

	// Verify
	res, _ := d.Query("GET test_row_key")
	if res.Error != "" || len(res.Rows) == 0 {
		t.Fatalf("expected GET to succeed after InsertRow, got error: %s", res.Error)
	}

	// UpdateRow
	err = d.UpdateRow("", "test_row", map[string]interface{}{"key": "test_row_key"}, map[string]interface{}{"value": "updated"})
	if err != nil {
		t.Fatalf("UpdateRow error: %v", err)
	}

	// DeleteRow
	err = d.DeleteRow("", "test_table", map[string]interface{}{"key": "test_row_key"})
	if err != nil {
		t.Fatalf("DeleteRow error: %v", err)
	}

	// Verify deleted
	res, _ = d.Query("GET test_row_key")
	if res.Error == "" {
		t.Error("GET should fail after DeleteRow")
	}
}

func TestIntegrationDeleteRowRequiresKey(t *testing.T) {
	d := connectOrFail(t)

	err := d.DeleteRow("", "test_table", map[string]interface{}{})
	if err == nil {
		t.Error("DeleteRow without 'key' should return error")
	}
	if !strings.Contains(err.Error(), "requires 'key'") {
		t.Errorf("error = %q, want containing 'requires 'key''", err.Error())
	}
}

func TestIntegrationUpdateRowRequiresKey(t *testing.T) {
	d := connectOrFail(t)

	err := d.UpdateRow("", "test_table", map[string]interface{}{}, map[string]interface{}{"value": "x"})
	if err == nil {
		t.Error("UpdateRow without 'key' in keyColumns should return error")
	}
	if !strings.Contains(err.Error(), "requires 'key'") {
		t.Errorf("error = %q, want containing 'requires 'key''", err.Error())
	}
}

func TestIntegrationGetSchema(t *testing.T) {
	d := connectOrFail(t)

	schema, err := d.GetSchema()
	if err != nil {
		t.Fatalf("GetSchema error: %v", err)
	}
	if len(schema) != 1 {
		t.Fatalf("GetSchema returned %d databases, want 1", len(schema))
	}
	if schema[0].Name != "127.0.0.1" {
		t.Errorf("schema database name = %q, want %q", schema[0].Name, "127.0.0.1")
	}
}

func TestIntegrationInfoAndDBSize(t *testing.T) {
	d := connectOrFail(t)

	// INFO
	res, err := d.Query("INFO")
	if err != nil {
		t.Fatalf("INFO error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("INFO returned error: %s", res.Error)
	}
	if len(res.Rows) == 0 {
		t.Error("INFO returned no rows")
	}

	// DBSIZE
	res, err = d.Query("DBSIZE")
	if err != nil {
		t.Fatalf("DBSIZE error: %v", err)
	}
	if res.Error != "" {
		t.Fatalf("DBSIZE returned error: %s", res.Error)
	}
}
