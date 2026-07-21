// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import (
	"fmt"

	"clientdb/backend/db"
)

func (d *Driver) handleType(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "TYPE requires a key"}, nil }
	val, err := d.client.Type(d.ctx, args[0]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"type"}, Rows: [][]interface{}{{val}}}, nil
}

func (d *Driver) handleTTL(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "TTL requires a key"}, nil }
	val, err := d.client.TTL(d.ctx, args[0]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"ttl"}, Rows: [][]interface{}{{val.Seconds()}}}, nil
}

func (d *Driver) handleExists(args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: "EXISTS requires a key"}, nil }
	count, err := d.client.Exists(d.ctx, args[0]).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"exists"}, Rows: [][]interface{}{{count}}}, nil
}

func (d *Driver) handleIncr(cmd string, args []string) (*db.QueryResult, error) {
	if len(args) < 1 { return &db.QueryResult{Error: cmd + " requires a key"}, nil }
	var val int64
	var err error
	switch cmd {
	case "INCR": val, err = d.client.Incr(d.ctx, args[0]).Result()
	case "DECR": val, err = d.client.Decr(d.ctx, args[0]).Result()
	case "INCRBY":
		amount := int64(1)
		if len(args) > 1 { amount, _ = parseInt64(args[1]) }
		val, err = d.client.IncrBy(d.ctx, args[0], amount).Result()
	case "DECRBY":
		amount := int64(1)
		if len(args) > 1 { amount, _ = parseInt64(args[1]) }
		val, err = d.client.DecrBy(d.ctx, args[0], amount).Result()
	}
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"value"}, Rows: [][]interface{}{{val}}}, nil
}

func (d *Driver) handleInfo() (*db.QueryResult, error) {
	val, err := d.client.Info(d.ctx).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"info"}, Rows: [][]interface{}{{val}}}, nil
}

func (d *Driver) handleDBSize() (*db.QueryResult, error) {
	val, err := d.client.DBSize(d.ctx).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"keys"}, Rows: [][]interface{}{{val}}}, nil
}

func (d *Driver) handleRawCommand(cmd string, args []string) (*db.QueryResult, error) {
	allArgs := append([]string{cmd}, args...)
	val, err := d.client.Do(d.ctx, interfaceSlice(allArgs)...).Result()
	if err != nil { return &db.QueryResult{Error: err.Error()}, nil }
	return &db.QueryResult{Columns: []string{"result"}, Rows: [][]interface{}{{fmt.Sprintf("%v", val)}}}, nil
}

func parseInt64(s string) (int64, error) {
	var n int64
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}

func interfaceSlice(ss []string) []interface{} {
	result := make([]interface{}, len(ss))
	for i, s := range ss { result[i] = s }
	return result
}
