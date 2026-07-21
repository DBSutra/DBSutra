// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import (
	"fmt"

	"clientdb/backend/db"
)

func (d *Driver) handleGet(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "GET requires a key"}, nil }
	val, err := d.client.Get(d.ctx, args[0]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"key", "value"}, Rows: [][]interface{}{{args[0], val}}}, nil
}

func (d *Driver) handleMGet(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "MGET requires at least one key"}, nil }
	vals, err := d.client.MGet(d.ctx, args...).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	var rows [][]interface{}
	for i, val := range vals {
		v := ""
		if val != nil { v = fmt.Sprintf("%v", val) }
		rows = append(rows, []interface{}{args[i], v})
	}
	return &db.QueryResult{Columns: []string{"key", "value"}, Rows: rows}, nil
}

func (d *Driver) handleSet(args []string) (*db.QueryResult, error) {
	if len(args) < 2 { return &db.QueryResult{Error: "SET requires key and value"}, nil }
	err := d.client.Set(d.ctx, args[0], args[1], 0).Err()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"status"}, Rows: [][]interface{}{{"OK"}}}, nil
}

func (d *Driver) handleDel(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "DEL requires at least one key"}, nil }
	count, err := d.client.Del(d.ctx, args...).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"deleted"}, Rows: [][]interface{}{{count}}}, nil
}

func (d *Driver) handleKeys(args []string) (*db.QueryResult, error) {
	pattern := "*"
	if len(args) > 0 { pattern = args[0] }
	keys, err := d.client.Keys(d.ctx, pattern).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	var rows [][]interface{}
	for _, k := range keys { rows = append(rows, []interface{}{k}) }
	return &db.QueryResult{Columns: []string{"key"}, Rows: rows}, nil
}
