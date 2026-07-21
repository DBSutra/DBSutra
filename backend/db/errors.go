// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import "fmt"

// ══════════════════════════════════════════════════════════════════════════════
// ERRORS — structured error types for the database layer
// ══════════════════════════════════════════════════════════════════════════════

// QueryError wraps a query execution error with context
type QueryError struct {
	Driver  string
	Query   string
	Message string
	Err     error
}

func (e *QueryError) Error() string {
	return fmt.Sprintf("[%s] query error: %s (query: %s)", e.Driver, e.Message, e.Query)
}

func (e *QueryError) Unwrap() error { return e.Err }

// ConnectionError wraps a connection error with context
type ConnectionError struct {
	Driver  string
	Host    string
	Port    int
	Message string
	Err     error
}

func (e *ConnectionError) Error() string {
	return fmt.Sprintf("[%s] connection error at %s:%d: %s", e.Driver, e.Host, e.Port, e.Message)
}

func (e *ConnectionError) Unwrap() error { return e.Err }

// SchemaError wraps a schema introspection error with context
type SchemaError struct {
	Driver  string
	Op      string
	Message string
	Err     error
}

func (e *SchemaError) Error() string {
	return fmt.Sprintf("[%s] schema %s: %s", e.Driver, e.Op, e.Message)
}

func (e *SchemaError) Unwrap() error { return e.Err }

// wrapQueryError creates a QueryError from a driver name, query, and error
func WrapQueryError(driver, query string, err error) *QueryError {
	return &QueryError{Driver: driver, Query: query, Message: err.Error(), Err: err}
}

// wrapConnectionError creates a ConnectionError
func WrapConnectionError(driver, host string, port int, err error) *ConnectionError {
	return &ConnectionError{Driver: driver, Host: host, Port: port, Message: err.Error(), Err: err}
}

// wrapSchemaError creates a SchemaError
func WrapSchemaError(driver, op string, err error) *SchemaError {
	return &SchemaError{Driver: driver, Op: op, Message: err.Error(), Err: err}
}
