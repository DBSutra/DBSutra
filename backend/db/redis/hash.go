// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import "clientdb/backend/db"

func (d *Driver) handleHGetAll(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "HGETALL requires a key"}, nil }
	vals, err := d.client.HGetAll(d.ctx, args[0]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	var rows [][]interface{}
	for k, v := range vals { rows = append(rows, []interface{}{k, v}) }
	return &db.QueryResult{Columns: []string{"field", "value"}, Rows: rows}, nil
}

func (d *Driver) handleHGet(args []string) (*db.QueryResult, error) {
	if len(args) < 2 { return &db.QueryResult{Error: "HGET requires key and field"}, nil }
	val, err := d.client.HGet(d.ctx, args[0], args[1]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"field", "value"}, Rows: [][]interface{}{{args[1], val}}}, nil
}

func (d *Driver) handleHSet(args []string) (*db.QueryResult, error) {
	if len(args) < 3 { return &db.QueryResult{Error: "HSET requires key, field, and value"}, nil }
	err := d.client.HSet(d.ctx, args[0], args[1], args[2]).Err()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"status"}, Rows: [][]interface{}{{"OK"}}}, nil
}
