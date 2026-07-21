// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package postgres

import "clientdb/backend/db"

func (d *Driver) GetSchema() ([]db.SchemaDatabase, error) {
	dbName := d.cfg.Database
	if dbName == "" { dbName = "postgres" }

	rows, err := d.d.Query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
	if err != nil { return nil, db.WrapSchemaError("postgres", "GetSchema", err) }
	defer rows.Close()

	var tables []db.SchemaTable
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil { continue }
		columns, _ := d.getColumns("public", tableName)
		tables = append(tables, db.SchemaTable{Name: tableName, Columns: columns})
	}
	if len(tables) == 0 { tables = []db.SchemaTable{{Name: "no_tables", Columns: []db.SchemaColumn{{Name: "info", Type: "string", Nullable: true}}}} }
	return []db.SchemaDatabase{{Name: dbName, Tables: tables}}, nil
}

func (d *Driver) getColumns(schema, table string) ([]db.SchemaColumn, error) {
	rows, err := d.d.Query(`
		SELECT column_name, data_type, is_nullable,
			CASE WHEN constraint_type = 'PRIMARY KEY' THEN 'PRI' ELSE '' END as key
		FROM information_schema.columns c
		LEFT JOIN information_schema.key_column_usage k
			ON c.table_name = k.table_name AND c.column_name = k.column_name AND c.table_schema = k.table_schema
		LEFT JOIN information_schema.table_constraints t
			ON k.constraint_name = t.constraint_name AND t.constraint_type = 'PRIMARY KEY'
		WHERE c.table_schema = $1 AND c.table_name = $2
		ORDER BY c.ordinal_position`, schema, table)
	if err != nil { return nil, err }
	defer rows.Close()

	var columns []db.SchemaColumn
	for rows.Next() {
		var col db.SchemaColumn
		var nullable string
		if err := rows.Scan(&col.Name, &col.Type, &nullable, &col.Key); err != nil { continue }
		col.Nullable = nullable == "YES"
		columns = append(columns, col)
	}
	if len(columns) == 0 { columns = []db.SchemaColumn{{Name: "id", Type: "integer", Nullable: false, Key: "PRI"}} }
	return columns, nil
}
