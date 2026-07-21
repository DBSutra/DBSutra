// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mysql

import (
	"fmt"

	"clientdb/backend/db"
)

func (d *Driver) GetSchema() ([]db.SchemaDatabase, error) {
	rows, err := d.d.Query("SHOW DATABASES")
	if err != nil { return nil, db.WrapSchemaError("mysql", "GetSchema", err) }
	defer rows.Close()

	var databases []db.SchemaDatabase
	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err != nil { continue }
		if dbName == "information_schema" || dbName == "performance_schema" || dbName == "mysql" || dbName == "sys" { continue }
		tables, _ := d.getTables(dbName)
		databases = append(databases, db.SchemaDatabase{Name: dbName, Tables: tables})
	}
	if len(databases) == 0 {
		databases = []db.SchemaDatabase{{Name: "no_databases", Tables: []db.SchemaTable{{Name: "info", Columns: []db.SchemaColumn{{Name: "message", Type: "string", Nullable: true}}}}}}
	}
	return databases, nil
}

func (d *Driver) getTables(database string) ([]db.SchemaTable, error) {
	rows, err := d.d.Query(fmt.Sprintf("SHOW TABLES FROM `%s`", database))
	if err != nil { return nil, err }
	defer rows.Close()

	var tables []db.SchemaTable
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil { continue }
		columns, _ := d.getColumns(database, tableName)
		tables = append(tables, db.SchemaTable{Name: tableName, Columns: columns})
	}
	return tables, nil
}

func (d *Driver) getColumns(database, table string) ([]db.SchemaColumn, error) {
	rows, err := d.d.Query(fmt.Sprintf("DESCRIBE `%s`.`%s`", database, table))
	if err != nil { return nil, err }
	defer rows.Close()

	var columns []db.SchemaColumn
	for rows.Next() {
		var col db.SchemaColumn
		var null, key, extra string
		var defaultValue *string
		if err := rows.Scan(&col.Name, &col.Type, &null, &key, &defaultValue, &extra); err != nil { continue }
		col.Nullable = null == "YES"
		col.Key = key
		columns = append(columns, col)
	}
	if len(columns) == 0 { columns = []db.SchemaColumn{{Name: "id", Type: "int", Nullable: false, Key: "PRI"}} }
	return columns, nil
}
