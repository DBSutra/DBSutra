// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import "clientdb/backend/db"

func (d *Driver) handlePush(cmd string, args []string) (*db.QueryResult, error) {
	if len(args) < 2 { return &db.QueryResult{Error: cmd + " requires key and value"}, nil }
	var count int64
	var err error
	if cmd == "LPUSH" {
		count, err = d.client.LPush(d.ctx, args[0], args[1]).Result()
	} else {
		count, err = d.client.RPush(d.ctx, args[0], args[1]).Result()
	}
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"length"}, Rows: [][]interface{}{{count}}}, nil
}

func (d *Driver) handleLRange(args []string) (*db.QueryResult, error) {
	if len(args) < 3 { return &db.QueryResult{Error: "LRANGE requires key, start, and stop"}, nil }
	start, _ := parseInt64(args[1])
	stop, _ := parseInt64(args[2])
	vals, err := d.client.LRange(d.ctx, args[0], start, stop).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	var rows [][]interface{}
	for i, v := range vals { rows = append(rows, []interface{}{i, v}) }
	return &db.QueryResult{Columns: []string{"index", "value"}, Rows: rows}, nil
}
