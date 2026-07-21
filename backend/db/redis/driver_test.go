// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import (
	"strings"
	"testing"

	"clientdb/backend/db"
)

// ---------------------------------------------------------------------------
// Unit tests (no Redis server required)
// ---------------------------------------------------------------------------

func TestNewReturnsDriver(t *testing.T) {
	d := New()
	if d == nil {
		t.Fatal("New() returned nil")
	}
}

func TestDriverType(t *testing.T) {
	d := New()
	if got := d.Type(); got != "redis" {
		t.Errorf("Type() = %q, want %q", got, "redis")
	}
}

func TestNewImplementsDriverInterface(t *testing.T) {
	var _ db.Driver = New()
}

func TestConnectInvalidAddress(t *testing.T) {
	d := New()
	cfg := db.ConnectionConfig{
		Host: "127.0.0.1",
		Port: 1, // unlikely to have Redis on port 1; gets fast "connection refused"
	}
	err := d.Connect(cfg)
	if err == nil {
		t.Fatal("Connect to invalid address should return error")
	}

	// Verify it wraps as a ConnectionError
	ce, ok := err.(*db.ConnectionError)
	if !ok {
		t.Fatalf("expected *db.ConnectionError, got %T", err)
	}
	if ce.Driver != "redis" {
		t.Errorf("ConnectionError.Driver = %q, want %q", ce.Driver, "redis")
	}
	if ce.Host != "127.0.0.1" {
		t.Errorf("ConnectionError.Host = %q, want %q", ce.Host, "127.0.0.1")
	}
	if ce.Port != 1 {
		t.Errorf("ConnectionError.Port = %d, want %d", ce.Port, 1)
	}
}

func TestConnectDefaultHostPort(t *testing.T) {
	// Verify default host/port logic: when Port is 0 the driver should
	// default to 6379. Try connecting — if Redis is running locally the
	// connection succeeds (proving the default); if not, check the error
	// reports port 6379.
	d := New()
	cfg := db.ConnectionConfig{Host: "127.0.0.1", Port: 0}
	err := d.Connect(cfg)
	if err == nil {
		d.Disconnect()
		return // Redis is running on default port; default logic works
	}
	ce, ok := err.(*db.ConnectionError)
	if !ok {
		t.Fatalf("expected *db.ConnectionError, got %T", err)
	}
	if ce.Port != 6379 {
		t.Errorf("default port = %d, want 6379", ce.Port)
	}
}

func TestDisconnectNilClient(t *testing.T) {
	d := New()
	// Disconnect without ever connecting should not panic
	if err := d.Disconnect(); err != nil {
		t.Errorf("Disconnect on nil client returned error: %v", err)
	}
}

// ---------------------------------------------------------------------------
// parseRedisCommand tests (unexported, same package)
// ---------------------------------------------------------------------------

func TestParseRedisCommand(t *testing.T) {
	tests := []struct {
		name string
		cmd  string
		want []string
	}{
		{"simple", "GET foo", []string{"GET", "foo"}},
		{"multiple args", "SET key value", []string{"SET", "key", "value"}},
		{"leading/trailing spaces", "  GET  foo  ", []string{"GET", "foo"}},
		{"empty", "", nil},
		{"whitespace only", "   ", nil},
		{"double-quoted arg", `SET key "hello world"`, []string{"SET", "key", "hello world"}},
		{"single-quoted arg", `SET key 'hello world'`, []string{"SET", "key", "hello world"}},
		{"mixed quotes", `HSET myhash field "value with spaces"`, []string{"HSET", "myhash", "field", "value with spaces"}},
		{"single token", "DBSIZE", []string{"DBSIZE"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseRedisCommand(tt.cmd)
			if len(got) == 0 && len(tt.want) == 0 {
				return
			}
			if len(got) != len(tt.want) {
				t.Fatalf("parseRedisCommand(%q) = %v (len %d), want %v (len %d)",
					tt.cmd, got, len(got), tt.want, len(tt.want))
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("part[%d] = %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Command routing: Query() dispatches to the correct handler
// ---------------------------------------------------------------------------

// queryRoutingDriver returns a Driver with client=nil so we can call Query()
// and verify argument validation without needing a live Redis connection.
// Commands that hit the nil client will panic, so we only test argument
// validation paths here (empty/missing args). Real command execution is
// covered by the integration tests below.
func queryRoutingDriver() *Driver {
	return &Driver{}
}

func TestQueryEmptyCommand(t *testing.T) {
	d := queryRoutingDriver()
	result, err := d.Query("")
	if err != nil {
		t.Fatalf("Query(\"\") returned unexpected error: %v", err)
	}
	if result.Error != "empty command" {
		t.Errorf("Query(\"\") error = %q, want %q", result.Error, "empty command")
	}
}

func TestQueryWhitespaceOnly(t *testing.T) {
	d := queryRoutingDriver()
	result, err := d.Query("   ")
	if err != nil {
		t.Fatalf("Query(\"   \") returned unexpected error: %v", err)
	}
	if result.Error != "empty command" {
		t.Errorf("Query(\"   \") error = %q, want %q", result.Error, "empty command")
	}
}

func TestQueryArgValidation(t *testing.T) {
	d := queryRoutingDriver()

	tests := []struct {
		name       string
		cmd        string
		wantErrSub string
	}{
		{"GET no key", "GET", "requires a key"},
		{"MGET no keys", "MGET", "requires at least one key"},
		{"SET no args", "SET", "requires key and value"},
		{"SET one arg", "SET foo", "requires key and value"},
		{"DEL no key", "DEL", "requires at least one key"},
		{"HGETALL no key", "HGETALL", "requires a key"},
		{"HGET no args", "HGET", "requires key and field"},
		{"HGET one arg", "HGET foo", "requires key and field"},
		{"HSET no args", "HSET", "requires key, field, and value"},
		{"HSET one arg", "HSET foo", "requires key, field, and value"},
		{"HSET two args", "HSET foo bar", "requires key, field, and value"},
		{"LPUSH no args", "LPUSH", "requires key and value"},
		{"LPUSH one arg", "LPUSH foo", "requires key and value"},
		{"RPUSH no args", "RPUSH", "requires key and value"},
		{"LRANGE no args", "LRANGE", "requires key, start, and stop"},
		{"LRANGE one arg", "LRANGE foo", "requires key, start, and stop"},
		{"LRANGE two args", "LRANGE foo 0", "requires key, start, and stop"},
		{"SADD no args", "SADD", "requires key and member"},
		{"SADD one arg", "SADD foo", "requires key and member"},
		{"SMEMBERS no key", "SMEMBERS", "requires a key"},
		{"TYPE no key", "TYPE", "requires a key"},
		{"TTL no key", "TTL", "requires a key"},
		{"EXISTS no key", "EXISTS", "requires a key"},
		{"INCR no key", "INCR", "requires a key"},
		{"DECR no key", "DECR", "requires a key"},
		{"INCRBY no key", "INCRBY", "requires a key"},
		{"DECRBY no key", "DECRBY", "requires a key"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := d.Query(tt.cmd)
			if err != nil {
				t.Fatalf("Query(%q) returned unexpected error: %v", tt.cmd, err)
			}
			if result.Error == "" {
				t.Fatalf("Query(%q) expected error containing %q, got empty", tt.cmd, tt.wantErrSub)
			}
			if !strings.Contains(result.Error, tt.wantErrSub) {
				t.Errorf("Query(%q) error = %q, want containing %q", tt.cmd, result.Error, tt.wantErrSub)
			}
		})
	}
}

func TestQueryCommandRouting(t *testing.T) {
	// Verify that each recognized command word routes to the correct handler.
	// Commands with enough arguments pass validation and hit the nil client,
	// causing a panic. Both outcomes (validation error or nil-client panic)
	// confirm the command was routed. An "unknown command" error from
	// handleRawCommand would mean the command was NOT recognized.
	d := queryRoutingDriver()

	recognized := []string{
		"GET foo", "MGET foo", "SET foo bar", "DEL foo", "KEYS",
		"HGETALL foo", "HGET foo f", "HSET foo f v",
		"LPUSH foo v", "RPUSH foo v", "LRANGE foo 0 -1",
		"SADD foo m", "SMEMBERS foo",
		"TYPE foo", "TTL foo", "EXISTS foo",
		"INCR foo", "DECR foo", "INCRBY foo 1", "DECRBY foo 1",
		"INFO", "DBSIZE",
	}

	for _, cmd := range recognized {
		t.Run(cmd, func(t *testing.T) {
			var result *db.QueryResult
			var err error
			panicked := false

			func() {
				defer func() {
					if r := recover(); r != nil {
						panicked = true
					}
				}()
				result, err = d.Query(cmd)
			}()

			if panicked {
				// Command was routed to its handler (good), which panicked
				// on the nil client.
				return
			}
			if err != nil {
				t.Fatalf("Query(%q) returned unexpected error: %v", cmd, err)
			}
			if result != nil && strings.Contains(result.Error, "unknown command") {
				t.Errorf("command %q was not recognized by the router", cmd)
			}
		})
	}
}

