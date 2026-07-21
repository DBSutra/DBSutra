// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package elasticsearch

import (
	"clientdb/backend/db"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/elastic/go-elasticsearch/v8/esapi"
)

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA — Elasticsearch schema introspection
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) GetSchema() ([]db.SchemaDatabase, error) {
	res, err := d.client.Cat.Indices(d.client.Cat.Indices.WithFormat("json"), d.client.Cat.Indices.WithV(true))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var indices []map[string]interface{}
	if err := json.Unmarshal(body, &indices); err != nil {
		return nil, err
	}

	var tables []db.SchemaTable
	for _, idx := range indices {
		indexName, _ := idx["index"].(string)
		if indexName == "" || strings.HasPrefix(indexName, ".") {
			continue
		}

		columns := d.getIndexColumns(indexName)
		docsCount, _ := idx["docs.count"].(string)
		tableName := indexName
		if docsCount != "" {
			tableName = fmt.Sprintf("%s (%s docs)", indexName, docsCount)
		}
		tables = append(tables, db.SchemaTable{Name: tableName, Columns: columns})
	}

	if len(tables) == 0 {
		tables = []db.SchemaTable{{Name: "no_indices", Columns: []db.SchemaColumn{{Name: "info", Type: "string", Nullable: true}}}}
	}

	dbName := "elasticsearch"
	if d.cfg.Host != "" {
		dbName = fmt.Sprintf("%s:%d", d.cfg.Host, d.cfg.Port)
	}
	return []db.SchemaDatabase{{Name: dbName, Tables: tables}}, nil
}

// getIndexColumns retrieves the column schema for an Elasticsearch index
func (d *Driver) getIndexColumns(indexName string) []db.SchemaColumn {
	columns := []db.SchemaColumn{
		{Name: "_id", Type: "keyword", Nullable: false, Key: "PRI"},
		{Name: "_score", Type: "float", Nullable: true},
		{Name: "_source", Type: "object", Nullable: true},
	}

	mappingRes, err := d.client.Indices.GetMapping(d.client.Indices.GetMapping.WithIndex(indexName))
	if err != nil {
		return columns
	}
	defer mappingRes.Body.Close()

	mappingBody, _ := io.ReadAll(mappingRes.Body)
	var mappingResult map[string]interface{}
	if err := json.Unmarshal(mappingBody, &mappingResult); err != nil {
		return columns
	}

	if idxMapping, ok := mappingResult[indexName].(map[string]interface{}); ok {
		if mappings, ok := idxMapping["mappings"].(map[string]interface{}); ok {
			if props, ok := mappings["properties"].(map[string]interface{}); ok {
				for field, def := range props {
					defMap, ok := def.(map[string]interface{})
					if !ok {
						continue
					}
					fieldType, _ := defMap["type"].(string)
					if fieldType == "" {
						fieldType = "object"
					}
					columns = append(columns, db.SchemaColumn{Name: field, Type: fieldType, Nullable: true})
				}
			}
		}
	}
	return columns
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSERS
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) parseSearchResponse(res *esapi.Response) (*db.QueryResult, error) {
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return &db.QueryResult{Error: string(body)}, nil
	}

	if res.IsError() {
		reason, _ := result["error"].(map[string]interface{})
		msg, _ := reason["reason"].(string)
		if msg == "" {
			msg = string(body)
		}
		return &db.QueryResult{Error: msg}, nil
	}

	hits, _ := result["hits"].(map[string]interface{})
	total, _ := hits["total"].(map[string]interface{})
	totalValue, _ := total["value"].(float64)
	hitsList, _ := hits["hits"].([]interface{})

	if len(hitsList) == 0 {
		return &db.QueryResult{Columns: []string{"_index", "_id", "_score", "_source"}, Rows: [][]interface{}{}}, nil
	}

	var rows [][]interface{}
	for _, hit := range hitsList {
		h := hit.(map[string]interface{})
		index, _ := h["_index"]
		id, _ := h["_id"]
		score, _ := h["_score"]
		source, _ := h["_source"]
		sourceJSON, _ := json.Marshal(source)
		rows = append(rows, []interface{}{index, id, score, string(sourceJSON)})
	}

	return &db.QueryResult{Columns: []string{"_index", "_id", "_score", "_source"}, Rows: rows, RowsAffected: int64(totalValue)}, nil
}

func (d *Driver) parseGenericResponse(res *esapi.Response) (*db.QueryResult, error) {
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.IsError() {
		return &db.QueryResult{Error: string(body)}, nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return &db.QueryResult{Columns: []string{"response"}, Rows: [][]interface{}{{string(body)}}}, nil
	}

	var rows [][]interface{}
	for k, v := range result {
		val, _ := json.Marshal(v)
		rows = append(rows, []interface{}{k, string(val)})
	}
	return &db.QueryResult{Columns: []string{"key", "value"}, Rows: rows}, nil
}
