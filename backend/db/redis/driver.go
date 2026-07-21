// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"clientdb/backend/db"
	clog "clientdb/backend/log"

	"github.com/redis/go-redis/v9"
)

var log = clog.New("redis")

type Driver struct {
	client *redis.Client
	cfg    db.ConnectionConfig
	ctx    context.Context
}

func New() db.Driver { return &Driver{ctx: context.Background()} }
func (d *Driver) Type() string { return "redis" }

func (d *Driver) Connect(cfg db.ConnectionConfig) error {
	host := cfg.Host
	if host == "" { host = "127.0.0.1" }
	port := cfg.Port
	if port == 0 { port = 6379 }
	dbIdx := 0
	if cfg.Database != "" { dbIdx, _ = strconv.Atoi(cfg.Database) }

	log.Info("Connect: host=%s port=%d db=%d", host, port, dbIdx)

	d.client = redis.NewClient(&redis.Options{
		Addr:        fmt.Sprintf("%s:%d", host, port),
		Password:    cfg.Password,
		DB:          dbIdx,
		DialTimeout: 5 * time.Second,
		ReadTimeout: 5 * time.Second,
	})
	if err := d.client.Ping(d.ctx).Err(); err != nil {
		log.Error("Ping failed at %s:%d: %v", host, port, err)
		return db.WrapConnectionError("redis", host, port, err)
	}
	d.cfg = cfg
	log.Info("Connected to Redis at %s:%d db=%d", host, port, dbIdx)
	return nil
}

func (d *Driver) Disconnect() error { if d.client != nil { return d.client.Close() }; return nil }
func (d *Driver) Ping() error { return d.client.Ping(d.ctx).Err() }

func (d *Driver) InsertRow(database, table string, data map[string]interface{}) error {
	key := table
	if val, ok := data["key"].(string); ok { key = val }
	value := ""
	if val, ok := data["value"]; ok { value = fmt.Sprintf("%v", val) }
	return d.client.Set(d.ctx, key, value, 0).Err()
}

func (d *Driver) UpdateRow(database, table string, keyColumns, data map[string]interface{}) error {
	key := ""
	if val, ok := keyColumns["key"].(string); ok { key = val }
	if key == "" { return fmt.Errorf("redis UpdateRow requires 'key' in keyColumns") }
	value := ""
	if val, ok := data["value"]; ok { value = fmt.Sprintf("%v", val) }
	return d.client.Set(d.ctx, key, value, 0).Err()
}

func (d *Driver) DeleteRow(database, table string, keyColumns map[string]interface{}) error {
	key := ""
	if val, ok := keyColumns["key"].(string); ok { key = val }
	if key == "" { return fmt.Errorf("redis DeleteRow requires 'key' in keyColumns") }
	return d.client.Del(d.ctx, key).Err()
}
