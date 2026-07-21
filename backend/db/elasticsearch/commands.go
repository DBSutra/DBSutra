// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package elasticsearch

import (
	"clientdb/backend/db"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/elastic/go-elasticsearch/v8/esapi"
)

// ══════════════════════════════════════════════════════════════════════════════
// COMMANDS — Elasticsearch utility and admin commands
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) handleCount(arg string) (*db.QueryResult, error) {
	index := "_all"
	query := ""
	if arg != "" {
		parts := strings.SplitN(arg, " ", 2)
		index = parts[0]
		if len(parts) > 1 {
			query = parts[1]
		}
	}
	var buf bytes.Buffer
	if query != "" {
		buf.WriteString(query)
	}
	res, err := d.client.Count(d.client.Count.WithContext(d.ctx), d.client.Count.WithIndex(index), d.client.Count.WithBody(&buf))
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}

func (d *Driver) handleCat(arg string) (*db.QueryResult, error) {
	target := strings.TrimSpace(arg)
	if target == "" {
		target = "indices"
	}
	var res *esapi.Response
	var err error
	switch target {
	case "indices":
		res, err = d.client.Cat.Indices(d.client.Cat.Indices.WithContext(d.ctx), d.client.Cat.Indices.WithFormat("json"))
	case "health":
		res, err = d.client.Cat.Health(d.client.Cat.Health.WithContext(d.ctx), d.client.Cat.Health.WithFormat("json"))
	case "nodes":
		res, err = d.client.Cat.Nodes(d.client.Cat.Nodes.WithContext(d.ctx), d.client.Cat.Nodes.WithFormat("json"))
	default:
		return &db.QueryResult{Error: fmt.Sprintf("unsupported CAT target: %s", target)}, nil
	}
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	var items []map[string]interface{}
	if err := json.Unmarshal(body, &items); err != nil {
		return &db.QueryResult{Error: string(body)}, nil
	}
	if len(items) == 0 {
		return &db.QueryResult{Columns: []string{"info"}, Rows: [][]interface{}{{"No results"}}}, nil
	}

	var cols []string
	for k := range items[0] {
		cols = append(cols, k)
	}
	var rows [][]interface{}
	for _, item := range items {
		row := make([]interface{}, len(cols))
		for i, col := range cols {
			row[i] = item[col]
		}
		rows = append(rows, row)
	}
	return &db.QueryResult{Columns: cols, Rows: rows}, nil
}

func (d *Driver) handleCluster() (*db.QueryResult, error) {
	res, err := d.client.Cluster.Health()
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}

func (d *Driver) handleInfo() (*db.QueryResult, error) {
	res, err := d.client.Info()
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}

func (d *Driver) handlePing() (*db.QueryResult, error) {
	res, err := d.client.Ping()
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	if res.IsError() {
		return &db.QueryResult{Error: res.String()}, nil
	}
	return &db.QueryResult{Columns: []string{"status"}, Rows: [][]interface{}{{"connected"}}}, nil
}

func (d *Driver) handleMapping(arg string) (*db.QueryResult, error) {
	if arg == "" {
		return &db.QueryResult{Error: "MAPPING requires an index name"}, nil
	}
	res, err := d.client.Indices.GetMapping(d.client.Indices.GetMapping.WithIndex(arg))
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}

func (d *Driver) handleBulk(arg string) (*db.QueryResult, error) {
	if arg == "" {
		return &db.QueryResult{Error: "BULK requires NDJSON body"}, nil
	}
	var buf bytes.Buffer
	buf.WriteString(arg)
	res, err := d.client.Bulk(&buf)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}

func (d *Driver) handleRawSearch(command, arg string) (*db.QueryResult, error) {
	index := strings.ToLower(command)
	query := `{"query":{"match_all":{}}}`
	if arg != "" {
		query = arg
	}
	var buf bytes.Buffer
	buf.WriteString(query)
	res, err := d.client.Search(
		d.client.Search.WithContext(d.ctx),
		d.client.Search.WithIndex(index),
		d.client.Search.WithBody(&buf),
		d.client.Search.WithTrackTotalHits(true),
	)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseSearchResponse(res)
}
