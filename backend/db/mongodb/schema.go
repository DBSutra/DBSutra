// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mongodb

import (
	"clientdb/backend/db"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA — MongoDB schema introspection
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) GetSchema() ([]db.SchemaDatabase, error) {
	dbName := d.cfg.Database
	if dbName == "" {
		dbName = "admin"
	}

	mongoDB := d.client.Database(dbName)
	collections, err := mongoDB.ListCollectionNames(d.ctx, bson.M{}, options.ListCollections().SetNameOnly(true))
	if err != nil {
		return nil, err
	}

	var tables []db.SchemaTable
	for _, collName := range collections {
		columns := d.getCollectionColumns(dbName, collName)
		tables = append(tables, db.SchemaTable{Name: collName, Columns: columns})
	}

	if len(tables) == 0 {
		tables = []db.SchemaTable{{
			Name:    "no_collections",
			Columns: []db.SchemaColumn{{Name: "info", Type: "string", Nullable: true}},
		}}
	}

	return []db.SchemaDatabase{{Name: dbName, Tables: tables}}, nil
}

// getCollectionColumns samples documents to infer the column schema
func (d *Driver) getCollectionColumns(dbName, collName string) []db.SchemaColumn {
	coll := d.client.Database(dbName).Collection(collName)
	cursor, err := coll.Find(d.ctx, bson.M{}, options.Find().SetLimit(5))
	if err != nil {
		return []db.SchemaColumn{{Name: "_id", Type: "objectId", Nullable: false, Key: "PRI"}}
	}
	defer cursor.Close(d.ctx)

	colSet := make(map[string]string)
	colSet["_id"] = "objectId"

	for cursor.Next(d.ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		for k, v := range doc {
			if _, exists := colSet[k]; !exists {
				colSet[k] = d.bsonTypeToString(v)
			}
		}
	}

	var columns []db.SchemaColumn
	for name, typ := range colSet {
		key := ""
		if name == "_id" {
			key = "PRI"
		}
		columns = append(columns, db.SchemaColumn{Name: name, Type: typ, Nullable: name != "_id", Key: key})
	}

	if len(columns) == 0 {
		columns = []db.SchemaColumn{{Name: "_id", Type: "objectId", Nullable: false, Key: "PRI"}}
	}

	return columns
}

func (d *Driver) bsonTypeToString(val interface{}) string {
	switch val.(type) {
	case string:
		return "string"
	case int32:
		return "int32"
	case int64:
		return "int64"
	case float64:
		return "double"
	case bool:
		return "bool"
	case bson.M:
		return "object"
	case bson.A:
		return "array"
	case nil:
		return "null"
	default:
		return fmt.Sprintf("%T", val)
	}
}
