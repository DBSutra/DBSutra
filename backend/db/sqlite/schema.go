// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package sqlite

import (
	"fmt"

	"clientdb/backend/db"
)

func (d *Driver) GetSchema() ([]db.SchemaDatabase, error) {
	dbName := d.cfg.Database
	if dbName == "" { dbName = "sqlite" }

	rows, err := d.d.Query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
	if err != nil { return nil, db.WrapSchemaError("sqlite", "GetSchema", err) }
	defer rows.Close()

	var tables []db.SchemaTable
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil { continue }
		columns, _ := d.getTableColumns(tableName)
		tables = append(tables, db.SchemaTable{Name: tableName, Columns: columns})
	}
	if len(tables) == 0 { tables = []db.SchemaTable{{Name: "no_tables", Columns: []db.SchemaColumn{{Name: "info", Type: "string", Nullable: true}}}} }
	return []db.SchemaDatabase{{Name: dbName, Tables: tables}}, nil
}

func (d *Driver) getTableColumns(tableName string) ([]db.SchemaColumn, error) {
	rows, err := d.d.Query(fmt.Sprintf("PRAGMA table_info('%s')", tableName))
	if err != nil { return nil, err }
	defer rows.Close()

	var columns []db.SchemaColumn
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull int
		var dfltValue interface{}
		var pk int
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltValue, &pk); err != nil { continue }
		key := ""
		if pk > 0 { key = "PRI" }
		columns = append(columns, db.SchemaColumn{Name: name, Type: colType, Nullable: notNull == 0, Key: key})
	}
	if len(columns) == 0 { columns = []db.SchemaColumn{{Name: "id", Type: "INTEGER", Nullable: false, Key: "PRI"}} }
	return columns, nil
}
