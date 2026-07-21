// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import (
	"errors"
	"fmt"
	"testing"
)

// ── QueryError ────────────────────────────────────────────────────────────────

func TestQueryError_Error(t *testing.T) {
	e := &QueryError{
		Driver:  "postgres",
		Query:   "SELECT * FROM users",
		Message: "relation does not exist",
	}
	want := "[postgres] query error: relation does not exist (query: SELECT * FROM users)"
	if got := e.Error(); got != want {
		t.Errorf("QueryError.Error() = %q, want %q", got, want)
	}
}

func TestQueryError_Unwrap(t *testing.T) {
	inner := errors.New("relation does not exist")
	e := &QueryError{Err: inner}
	if got := e.Unwrap(); got != inner {
		t.Errorf("QueryError.Unwrap() = %v, want %v", got, inner)
	}
}

// ── ConnectionError ──────────────────────────────────────────────────────────

func TestConnectionError_Error(t *testing.T) {
	e := &ConnectionError{
		Driver:  "mysql",
		Host:    "db.example.com",
		Port:    3306,
		Message: "connection refused",
	}
	want := "[mysql] connection error at db.example.com:3306: connection refused"
	if got := e.Error(); got != want {
		t.Errorf("ConnectionError.Error() = %q, want %q", got, want)
	}
}

func TestConnectionError_Unwrap(t *testing.T) {
	inner := errors.New("connection refused")
	e := &ConnectionError{Err: inner}
	if got := e.Unwrap(); got != inner {
		t.Errorf("ConnectionError.Unwrap() = %v, want %v", got, inner)
	}
}

// ── SchemaError ──────────────────────────────────────────────────────────────

func TestSchemaError_Error(t *testing.T) {
	e := &SchemaError{
		Driver:  "sqlite",
		Op:      "list tables",
		Message: "database is locked",
	}
	want := "[sqlite] schema list tables: database is locked"
	if got := e.Error(); got != want {
		t.Errorf("SchemaError.Error() = %q, want %q", got, want)
	}
}

func TestSchemaError_Unwrap(t *testing.T) {
	inner := errors.New("database is locked")
	e := &SchemaError{Err: inner}
	if got := e.Unwrap(); got != inner {
		t.Errorf("SchemaError.Unwrap() = %v, want %v", got, inner)
	}
}

// ── Wrap helpers ─────────────────────────────────────────────────────────────

func TestWrapQueryError(t *testing.T) {
	inner := errors.New("syntax error")
	e := WrapQueryError("postgres", "SELCT *", inner)

	if e.Driver != "postgres" {
		t.Errorf("Driver = %q, want %q", e.Driver, "postgres")
	}
	if e.Query != "SELCT *" {
		t.Errorf("Query = %q, want %q", e.Query, "SELCT *")
	}
	if e.Message != "syntax error" {
		t.Errorf("Message = %q, want %q", e.Message, "syntax error")
	}
	if e.Err != inner {
		t.Errorf("Err = %v, want %v", e.Err, inner)
	}
}

func TestWrapConnectionError(t *testing.T) {
	inner := errors.New("timeout")
	e := WrapConnectionError("mysql", "127.0.0.1", 3306, inner)

	if e.Driver != "mysql" {
		t.Errorf("Driver = %q, want %q", e.Driver, "mysql")
	}
	if e.Host != "127.0.0.1" {
		t.Errorf("Host = %q, want %q", e.Host, "127.0.0.1")
	}
	if e.Port != 3306 {
		t.Errorf("Port = %d, want %d", e.Port, 3306)
	}
	if e.Message != "timeout" {
		t.Errorf("Message = %q, want %q", e.Message, "timeout")
	}
	if e.Err != inner {
		t.Errorf("Err = %v, want %v", e.Err, inner)
	}
}

func TestWrapSchemaError(t *testing.T) {
	inner := errors.New("permission denied")
	e := WrapSchemaError("sqlite", "describe table", inner)

	if e.Driver != "sqlite" {
		t.Errorf("Driver = %q, want %q", e.Driver, "sqlite")
	}
	if e.Op != "describe table" {
		t.Errorf("Op = %q, want %q", e.Op, "describe table")
	}
	if e.Message != "permission denied" {
		t.Errorf("Message = %q, want %q", e.Message, "permission denied")
	}
	if e.Err != inner {
		t.Errorf("Err = %v, want %v", e.Err, inner)
	}
}

// ── errors.Is / errors.As with wrapping ──────────────────────────────────────

func TestErrorsIs_WrappedErrors(t *testing.T) {
	sentinel := errors.New("sentinel")

	queryErr := WrapQueryError("postgres", "SELECT 1", fmt.Errorf("outer: %w", sentinel))
	if !errors.Is(queryErr, sentinel) {
		t.Error("errors.Is should find sentinel inside QueryError chain")
	}

	connErr := WrapConnectionError("mysql", "localhost", 3306, fmt.Errorf("outer: %w", sentinel))
	if !errors.Is(connErr, sentinel) {
		t.Error("errors.Is should find sentinel inside ConnectionError chain")
	}

	schemaErr := WrapSchemaError("sqlite", "list", fmt.Errorf("outer: %w", sentinel))
	if !errors.Is(schemaErr, sentinel) {
		t.Error("errors.Is should find sentinel inside SchemaError chain")
	}
}

func TestErrorsAs_WrappedErrors(t *testing.T) {
	inner := &QueryError{Driver: "pg", Query: "X", Message: "m"}
	wrapped := fmt.Errorf("wrapped: %w", inner)

	var target *QueryError
	if !errors.As(wrapped, &target) {
		t.Fatal("errors.As should extract *QueryError from wrapped chain")
	}
	if target.Driver != "pg" {
		t.Errorf("Driver = %q, want %q", target.Driver, "pg")
	}
}

func TestErrorsIs_NilUnwrap(t *testing.T) {
	e := &QueryError{Err: nil}
	if errors.Is(e, errors.New("anything")) {
		t.Error("errors.Is should return false when inner Err is nil and target is unrelated")
	}
}
