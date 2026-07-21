// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mongodb

import (
	"clientdb/backend/db"
	"fmt"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
)

// ══════════════════════════════════════════════════════════════════════════════
// COMMANDS — MongoDB write and utility commands
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) handleInsertOne(collection, rest string) (*db.QueryResult, error) {
	docJSON := d.extractJSON(rest)
	if docJSON == "" {
		return &db.QueryResult{Error: "insertOne requires a JSON document"}, nil
	}
	var doc bson.M
	if err := bson.UnmarshalExtJSON([]byte(docJSON), false, &doc); err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	coll := d.client.Database(d.cfg.Database).Collection(collection)
	res, err := coll.InsertOne(d.ctx, doc)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	return &db.QueryResult{Columns: []string{"insertedId"}, Rows: [][]interface{}{{fmt.Sprintf("%v", res.InsertedID)}}, RowsAffected: 1}, nil
}

func (d *Driver) handleInsertMany(collection, rest string) (*db.QueryResult, error) {
	docsJSON := d.extractJSONArray(rest)
	if docsJSON == "" {
		return &db.QueryResult{Error: "insertMany requires a JSON array"}, nil
	}
	var docs []bson.M
	if err := bson.UnmarshalExtJSON([]byte(docsJSON), false, &docs); err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	coll := d.client.Database(d.cfg.Database).Collection(collection)
	res, err := coll.InsertMany(d.ctx, d.toInterfaceSlice(docs))
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	return &db.QueryResult{Columns: []string{"insertedCount"}, Rows: [][]interface{}{{len(res.InsertedIDs)}}, RowsAffected: int64(len(res.InsertedIDs))}, nil
}

func (d *Driver) handleUpdate(collection, rest string) (*db.QueryResult, error) {
	isMultiple := strings.HasPrefix(rest, "updateMany(")
	args := d.extractParenContent(rest)
	parts := strings.SplitN(args, ",", 2)
	if len(parts) < 2 {
		return &db.QueryResult{Error: "update requires filter and update document"}, nil
	}
	var filter, update bson.M
	bson.UnmarshalExtJSON([]byte(strings.TrimSpace(parts[0])), false, &filter)
	bson.UnmarshalExtJSON([]byte(strings.TrimSpace(parts[1])), false, &update)

	coll := d.client.Database(d.cfg.Database).Collection(collection)
	if isMultiple {
		res, err := coll.UpdateMany(d.ctx, filter, update)
		if err != nil {
			return &db.QueryResult{Error: err.Error()}, nil
		}
		return &db.QueryResult{Columns: []string{"matchedCount", "modifiedCount"}, Rows: [][]interface{}{{res.MatchedCount, res.ModifiedCount}}}, nil
	}
	res, err := coll.UpdateOne(d.ctx, filter, update)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	return &db.QueryResult{Columns: []string{"matchedCount", "modifiedCount"}, Rows: [][]interface{}{{res.MatchedCount, res.ModifiedCount}}}, nil
}

func (d *Driver) handleDelete(collection, rest string) (*db.QueryResult, error) {
	isMultiple := strings.HasPrefix(rest, "deleteMany(")
	filterJSON := d.extractParenContent(rest)
	var filter bson.M
	bson.UnmarshalExtJSON([]byte(filterJSON), false, &filter)

	coll := d.client.Database(d.cfg.Database).Collection(collection)
	if isMultiple {
		res, err := coll.DeleteMany(d.ctx, filter)
		if err != nil {
			return &db.QueryResult{Error: err.Error()}, nil
		}
		return &db.QueryResult{Columns: []string{"deletedCount"}, Rows: [][]interface{}{{res.DeletedCount}}}, nil
	}
	res, err := coll.DeleteOne(d.ctx, filter)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	return &db.QueryResult{Columns: []string{"deletedCount"}, Rows: [][]interface{}{{res.DeletedCount}}}, nil
}

func (d *Driver) handleCount(collection, rest string) (*db.QueryResult, error) {
	filterJSON := d.extractParenContent(rest)
	var filter bson.M
	if filterJSON != "" && filterJSON != "{}" {
		bson.UnmarshalExtJSON([]byte(filterJSON), false, &filter)
	}
	coll := d.client.Database(d.cfg.Database).Collection(collection)
	count, err := coll.CountDocuments(d.ctx, filter)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	return &db.QueryResult{Columns: []string{"count"}, Rows: [][]interface{}{{count}}}, nil
}

func (d *Driver) handleAggregate(collection, rest string) (*db.QueryResult, error) {
	pipelineJSON := d.extractParenContent(rest)
	if pipelineJSON == "" {
		return &db.QueryResult{Error: "aggregate requires a pipeline array"}, nil
	}
	var pipeline []bson.M
	if err := bson.UnmarshalExtJSON([]byte(pipelineJSON), false, &pipeline); err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	coll := d.client.Database(d.cfg.Database).Collection(collection)
	cursor, err := coll.Aggregate(d.ctx, pipeline)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer cursor.Close(d.ctx)
	return d.cursorToResult(cursor)
}

func (d *Driver) handleDrop(collection string) (*db.QueryResult, error) {
	err := d.client.Database(d.cfg.Database).Collection(collection).Drop(d.ctx)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	return &db.QueryResult{Columns: []string{"status"}, Rows: [][]interface{}{{"dropped"}}}, nil
}

func (d *Driver) handleCreateCollection(collection string) (*db.QueryResult, error) {
	err := d.client.Database(d.cfg.Database).CreateCollection(d.ctx, collection)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	return &db.QueryResult{Columns: []string{"status"}, Rows: [][]interface{}{{"created"}}}, nil
}
