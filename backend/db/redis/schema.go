// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import "clientdb/backend/db"

func (d *Driver) GetSchema() ([]db.SchemaDatabase, error) {
	dbName := "redis"
	if d.cfg.Host != "" { dbName = d.cfg.Host }

	keys, err := d.client.Keys(d.ctx, "*").Result()
	if err != nil { return nil, db.WrapSchemaError("redis", "GetSchema", err) }

	var tables []db.SchemaTable
	for _, key := range keys {
		columns := []db.SchemaColumn{
			{Name: "key", Type: "string", Nullable: false, Key: "PRI"},
			{Name: "type", Type: "string", Nullable: false},
			{Name: "ttl", Type: "string", Nullable: true},
		}
		tables = append(tables, db.SchemaTable{Name: key, Columns: columns})
	}
	if len(tables) == 0 {
		tables = []db.SchemaTable{{Name: "no_keys", Columns: []db.SchemaColumn{{Name: "info", Type: "string", Nullable: true}}}}
	}
	return []db.SchemaDatabase{{Name: dbName, Tables: tables}}, nil
}
