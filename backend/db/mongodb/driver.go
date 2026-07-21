// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mongodb

import (
	"clientdb/backend/db"
	clog "clientdb/backend/log"
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var log = clog.New("mongodb")

type Driver struct {
	client *mongo.Client
	cfg    db.ConnectionConfig
	ctx    context.Context
}

func New() db.Driver {
	return &Driver{ctx: context.Background()}
}

func (d *Driver) Type() string { return "mongodb" }

func (d *Driver) Connect(cfg db.ConnectionConfig) error {
	host := cfg.Host
	if host == "" {
		host = "127.0.0.1"
	}
	port := cfg.Port
	if port == 0 {
		port = 27017
	}

	safe := cfg.Sanitized()
	log.Info("Connect: host=%s port=%d user=%s hasConnStr=%v",
		host, port, safe.Username, safe.ConnectionString != "")

	uri := cfg.ConnectionString
	if uri == "" {
		uri = fmt.Sprintf("mongodb://%s:%d", host, port)
		if cfg.Username != "" {
			uri = fmt.Sprintf("mongodb://%s:%s@%s:%d", cfg.Username, cfg.Password, host, port)
		}
	}

	ctx, cancel := context.WithTimeout(d.ctx, 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Error("mongo.Connect failed: %v", err)
		return fmt.Errorf("mongodb connect failed: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Error("Ping failed at %s:%d: %v", host, port, err)
		return fmt.Errorf("mongodb ping failed: %w", err)
	}

	d.client = client
	d.cfg = cfg
	log.Info("Connected to MongoDB at %s:%d", host, port)
	return nil
}

func (d *Driver) Disconnect() error {
	if d.client != nil {
		return d.client.Disconnect(d.ctx)
	}
	return nil
}

func (d *Driver) Ping() error {
	return d.client.Ping(d.ctx, nil)
}

func (d *Driver) InsertRow(database, table string, data map[string]interface{}) error {
	coll := d.client.Database(database).Collection(table)
	_, err := coll.InsertOne(d.ctx, data)
	return err
}

func (d *Driver) UpdateRow(database, table string, keyColumns, data map[string]interface{}) error {
	coll := d.client.Database(database).Collection(table)
	filter := bson.M{}
	for k, v := range keyColumns {
		filter[k] = v
	}
	_, err := coll.UpdateOne(d.ctx, filter, bson.M{"$set": data})
	return err
}

func (d *Driver) DeleteRow(database, table string, keyColumns map[string]interface{}) error {
	coll := d.client.Database(database).Collection(table)
	filter := bson.M{}
	for k, v := range keyColumns {
		filter[k] = v
	}
	_, err := coll.DeleteOne(d.ctx, filter)
	return err
}

// mongoCoerceValue converts string values to appropriate BSON types
func mongoCoerceValue(key string, val interface{}) interface{} {
	s, ok := val.(string)
	if !ok {
		return val
	}
	if s == "true" {
		return true
	}
	if s == "false" {
		return false
	}
	if s == "null" || s == "nil" {
		return nil
	}
	return s
}
