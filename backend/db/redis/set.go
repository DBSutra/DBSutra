// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import "clientdb/backend/db"

func (d *Driver) handleSAdd(args []string) (*db.QueryResult, error) {
	if len(args) < 2 { return &db.QueryResult{Error: "SADD requires key and member"}, nil }
	count, err := d.client.SAdd(d.ctx, args[0], args[1]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"added"}, Rows: [][]interface{}{{count}}}, nil
}

func (d *Driver) handleSMembers(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "SMEMBERS requires a key"}, nil }
	members, err := d.client.SMembers(d.ctx, args[0]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	var rows [][]interface{}
	for _, m := range members { rows = append(rows, []interface{}{m}) }
	return &db.QueryResult{Columns: []string{"member"}, Rows: rows}, nil
}
