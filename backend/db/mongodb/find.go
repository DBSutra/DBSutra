// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mongodb

import (
	"clientdb/backend/db"
	"encoding/json"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ══════════════════════════════════════════════════════════════════════════════
// FIND — MongoDB find/findOne query handlers
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) handleFind(collection, rest string) (*db.QueryResult, error) {
	query, sort, limit := d.parseFindArgs(rest)
	coll := d.client.Database(d.cfg.Database).Collection(collection)
	opts := options.Find().SetLimit(limit)
	if sort != nil {
		opts.SetSort(sort)
	}
	filter := bson.M{}
	if query != nil {
		filter = query
	}
	cursor, err := coll.Find(d.ctx, filter, opts)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer cursor.Close(d.ctx)
	return d.cursorToResult(cursor)
}

func (d *Driver) handleFindOne(collection, rest string) (*db.QueryResult, error) {
	query := d.parseQueryArg(rest)
	coll := d.client.Database(d.cfg.Database).Collection(collection)
	filter := bson.M{}
	if query != nil {
		filter = query
	}
	var result bson.M
	err := coll.FindOne(d.ctx, filter).Decode(&result)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			return &db.QueryResult{Columns: []string{"info"}, Rows: [][]interface{}{{"no documents found"}}}, nil
		}
		return &db.QueryResult{Error: err.Error()}, nil
	}
	cols, rows := d.bsonToRows([]bson.M{result})
	return &db.QueryResult{Columns: cols, Rows: rows}, nil
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS — MongoDB query parsing utilities
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) parseFindArgs(rest string) (bson.M, bson.M, int64) {
	content := d.extractParenContent(rest)
	if content == "" || content == "{}" {
		return nil, nil, 100
	}
	var query bson.M
	bson.UnmarshalExtJSON([]byte(content), false, &query)
	sort := d.extractMethod(rest, "sort")
	limit := d.extractMethod(rest, "limit")
	var sortDoc bson.M
	if sort != "" {
		bson.UnmarshalExtJSON([]byte(sort), false, &sortDoc)
	}
	limitVal := int64(100)
	if limit != "" {
		json.Unmarshal([]byte(limit), &limitVal)
	}
	return query, sortDoc, limitVal
}

func (d *Driver) parseQueryArg(rest string) bson.M {
	content := d.extractParenContent(rest)
	if content == "" || content == "{}" {
		return nil
	}
	var query bson.M
	bson.UnmarshalExtJSON([]byte(content), false, &query)
	return query
}

func (d *Driver) cursorToResult(cursor *mongo.Cursor) (*db.QueryResult, error) {
	var docs []bson.M
	if err := cursor.All(d.ctx, &docs); err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	if len(docs) == 0 {
		return &db.QueryResult{Columns: []string{"info"}, Rows: [][]interface{}{{"no documents found"}}}, nil
	}
	cols, rows := d.bsonToRows(docs)
	return &db.QueryResult{Columns: cols, Rows: rows, RowsAffected: int64(len(rows))}, nil
}

func (d *Driver) bsonToRows(docs []bson.M) ([]string, [][]interface{}) {
	colSet := make(map[string]bool)
	for _, doc := range docs {
		for k := range doc {
			colSet[k] = true
		}
	}
	var cols []string
	for k := range colSet {
		cols = append(cols, k)
	}
	var rows [][]interface{}
	for _, doc := range docs {
		row := make([]interface{}, len(cols))
		for i, col := range cols {
			if val, ok := doc[col]; ok {
				row[i] = d.formatBSONValue(val)
			} else {
				row[i] = nil
			}
		}
		rows = append(rows, row)
	}
	return cols, rows
}

func (d *Driver) formatBSONValue(val interface{}) interface{} {
	switch v := val.(type) {
	case bson.M:
		b, _ := json.Marshal(v)
		return string(b)
	case bson.A:
		b, _ := json.Marshal(v)
		return string(b)
	default:
		return val
	}
}

func (d *Driver) toInterfaceSlice(docs []bson.M) []interface{} {
	result := make([]interface{}, len(docs))
	for i, doc := range docs {
		result[i] = doc
	}
	return result
}
