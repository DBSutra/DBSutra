// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import "net"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES — shared across all DB drivers
// ══════════════════════════════════════════════════════════════════════════════

// QueryResult represents the result of a database query
type QueryResult struct {
	Columns      []string        `json:"columns"`
	Rows         [][]interface{} `json:"rows"`
	RowsAffected int64           `json:"rowsAffected"`
	Error        string          `json:"error,omitempty"`
}

// SchemaDatabase represents a database in the schema
type SchemaDatabase struct {
	Name   string        `json:"name"`
	Tables []SchemaTable `json:"tables"`
}

// SchemaTable represents a table in the schema
type SchemaTable struct {
	Name    string         `json:"name"`
	Columns []SchemaColumn `json:"columns"`
}

// SchemaColumn represents a column in a table
type SchemaColumn struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
	Key      string `json:"key,omitempty"`
}

// SSHConfig holds SSH tunnel parameters
type SSHConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password,omitempty"`
	KeyFile  string `json:"keyFile,omitempty"`
	KeyPass  string `json:"keyPass,omitempty"`
}

// ConnectionConfig holds connection parameters
type ConnectionConfig struct {
	ID               string            `json:"id"`
	Type             string            `json:"type"`
	Host             string            `json:"host"`
	Port             int               `json:"port"`
	Database         string            `json:"database"`
	Username         string            `json:"username"`
	Password         string            `json:"password"`
	SSL              bool              `json:"ssl"`
	ConnectionString string            `json:"connectionString,omitempty"`
	SSH              *SSHConfig        `json:"ssh,omitempty"`
	Options          map[string]string `json:"options,omitempty"`
}

// Driver is the interface all DB drivers must implement
type Driver interface {
	Type() string
	Connect(cfg ConnectionConfig) error
	Query(sql string) (*QueryResult, error)
	GetSchema() ([]SchemaDatabase, error)
	Disconnect() error
	Ping() error
	InsertRow(database, table string, data map[string]interface{}) error
	UpdateRow(database, table string, keyColumns, data map[string]interface{}) error
	DeleteRow(database, table string, keyColumns map[string]interface{}) error
}

// activeConn holds a live connection and its config
type activeConn struct {
	driver   Driver
	config   ConnectionConfig
	listener net.Listener // SSH tunnel listener (nil if no tunnel)
}
