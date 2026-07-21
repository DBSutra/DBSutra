// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mysql

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"clientdb/backend/db"
	clog "clientdb/backend/log"

	_ "github.com/go-sql-driver/mysql"
)

var log = clog.New("mysql")

type Driver struct {
	d   *sql.DB
	cfg db.ConnectionConfig
}

func New() db.Driver { return &Driver{} }
func (d *Driver) Type() string { return "mysql" }

func (d *Driver) Connect(cfg db.ConnectionConfig) error {
	host := cfg.Host
	if host == "" { host = "127.0.0.1" }
	port := cfg.Port
	if port == 0 { port = 3306 }

	safe := cfg.Sanitized()
	log.Info("Connect: host=%s port=%d db=%s user=%s ssl=%v",
		host, port, safe.Database, safe.Username, safe.SSL)

	connStr := cfg.ConnectionString
	if connStr == "" {
		connStr = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s", cfg.Username, cfg.Password, host, port, cfg.Database)
		if cfg.SSL { connStr += "?tls=true" }
	}

	conn, err := sql.Open("mysql", connStr)
	if err != nil {
		log.Error("sql.Open failed: %v", err)
		return db.WrapConnectionError("mysql", host, port, err)
	}
	if err := conn.Ping(); err != nil {
		log.Error("Ping failed at %s:%d: %v", host, port, err)
		return db.WrapConnectionError("mysql", host, port, err)
	}

	// Connection pool settings
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)

	d.d = conn
	d.cfg = cfg
	log.Info("Connected to MySQL at %s:%d/%s", host, port, cfg.Database)
	return nil
}

func (d *Driver) Query(sqlStr string) (*db.QueryResult, error) {
	sqlStr = strings.TrimSpace(sqlStr)
	if sqlStr == "" { return &db.QueryResult{Error: "empty query"}, nil }
	upper := strings.ToUpper(sqlStr)
	isSelect := strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "SHOW") ||
		strings.HasPrefix(upper, "DESCRIBE") || strings.HasPrefix(upper, "EXPLAIN")
	log.Debug("Query: type=%s len=%d", map[bool]string{true: "SELECT", false: "EXEC"}[isSelect], len(sqlStr))
	if isSelect { return db.ExecuteSelectQuery(d.d, "mysql", sqlStr) }
	return db.ExecuteNonQuery(d.d, "mysql", sqlStr)
}

func (d *Driver) Disconnect() error {
	if d.d != nil {
		log.Info("Disconnecting from MySQL")
		return d.d.Close()
	}
	return nil
}
func (d *Driver) Ping() error { return d.d.Ping() }

func (d *Driver) InsertRow(database, table string, data map[string]interface{}) error {
	query, vals := db.BuildInsertQuery("mysql", database, table, data, db.QuoteMySQL)
	_, err := d.d.Exec(query, vals...)
	return err
}

func (d *Driver) UpdateRow(database, table string, keyColumns, data map[string]interface{}) error {
	query, vals := db.BuildUpdateQuery("mysql", database, table, keyColumns, data, db.QuoteMySQL)
	_, err := d.d.Exec(query, vals...)
	return err
}

func (d *Driver) DeleteRow(database, table string, keyColumns map[string]interface{}) error {
	query, vals := db.BuildDeleteQuery("mysql", database, table, keyColumns, db.QuoteMySQL)
	_, err := d.d.Exec(query, vals...)
	return err
}
