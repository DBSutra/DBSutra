// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package sqlite

import (
	"database/sql"
	"strings"
	"time"

	"clientdb/backend/db"
	clog "clientdb/backend/log"

	_ "modernc.org/sqlite"
)

var log = clog.New("sqlite")

type Driver struct {
	d   *sql.DB
	cfg db.ConnectionConfig
}

func New() db.Driver { return &Driver{} }
func (d *Driver) Type() string { return "sqlite" }

func (d *Driver) Connect(cfg db.ConnectionConfig) error {
	dbPath := cfg.Database
	if dbPath == "" { dbPath = ":memory:" }

	log.Info("Connect: path=%s", dbPath)

	conn, err := sql.Open("sqlite", dbPath+"?_journal=WAL&_busy_timeout=5000")
	if err != nil {
		log.Error("sql.Open failed for %s: %v", dbPath, err)
		return db.WrapConnectionError("sqlite", dbPath, 0, err)
	}
	if err := conn.Ping(); err != nil {
		log.Error("Ping failed for %s: %v", dbPath, err)
		return db.WrapConnectionError("sqlite", dbPath, 0, err)
	}

	// Connection pool settings
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)

	d.d = conn
	d.cfg = cfg
	log.Info("Connected to SQLite at %s", dbPath)
	return nil
}

func (d *Driver) Query(sqlStr string) (*db.QueryResult, error) {
	sqlStr = strings.TrimSpace(sqlStr)
	if sqlStr == "" { return &db.QueryResult{Error: "empty query"}, nil }
	upper := strings.ToUpper(sqlStr)
	isSelect := strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "PRAGMA") || strings.HasPrefix(upper, "EXPLAIN")
	if isSelect { return db.ExecuteSelectQuery(d.d, "sqlite", sqlStr) }
	return db.ExecuteNonQuery(d.d, "sqlite", sqlStr)
}

func (d *Driver) Disconnect() error { if d.d != nil { return d.d.Close() }; return nil }
func (d *Driver) Ping() error { return d.d.Ping() }

func (d *Driver) InsertRow(database, table string, data map[string]interface{}) error {
	query, vals := db.BuildInsertQuery("sqlite", database, table, data, db.QuoteSQLite)
	_, err := d.d.Exec(query, vals...)
	return err
}

func (d *Driver) UpdateRow(database, table string, keyColumns, data map[string]interface{}) error {
	query, vals := db.BuildUpdateQuery("sqlite", database, table, keyColumns, data, db.QuoteSQLite)
	_, err := d.d.Exec(query, vals...)
	return err
}

func (d *Driver) DeleteRow(database, table string, keyColumns map[string]interface{}) error {
	query, vals := db.BuildDeleteQuery("sqlite", database, table, keyColumns, db.QuoteSQLite)
	_, err := d.d.Exec(query, vals...)
	return err
}
