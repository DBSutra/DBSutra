// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package elasticsearch

import (
	"clientdb/backend/db"
	"bytes"
	"strings"

	"github.com/elastic/go-elasticsearch/v8/esapi"
)

// ══════════════════════════════════════════════════════════════════════════════
// QUERY — Elasticsearch query command dispatcher
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) Query(queryStr string) (*db.QueryResult, error) {
	queryStr = strings.TrimSpace(queryStr)
	if queryStr == "" {
		return &db.QueryResult{Error: "empty query"}, nil
	}

	parts := strings.SplitN(queryStr, " ", 2)
	command := strings.ToUpper(parts[0])
	arg := ""
	if len(parts) > 1 {
		arg = strings.TrimSpace(parts[1])
	}

	switch command {
	case "SEARCH":
		return d.handleSearch(arg)
	case "GET":
		return d.handleGet(arg)
	case "INDEX":
		return d.handleIndex(arg)
	case "DELETE":
		return d.handleDelete(arg)
	case "COUNT":
		return d.handleCount(arg)
	case "CAT":
		return d.handleCat(arg)
	case "CLUSTER":
		return d.handleCluster()
	case "INFO":
		return d.handleInfo()
	case "PING":
		return d.handlePing()
	case "MAPPING":
		return d.handleMapping(arg)
	case "BULK":
		return d.handleBulk(arg)
	default:
		return d.handleRawSearch(command, arg)
	}
}

func (d *Driver) handleSearch(arg string) (*db.QueryResult, error) {
	index := "_all"
	query := `{"query":{"match_all":{}}}`
	if arg != "" {
		parts := strings.SplitN(arg, " ", 2)
		index = parts[0]
		if len(parts) > 1 {
			query = parts[1]
		}
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

func (d *Driver) handleGet(arg string) (*db.QueryResult, error) {
	if arg == "" {
		return &db.QueryResult{Error: "GET requires an index or index/id"}, nil
	}
	parts := strings.SplitN(arg, "/", 2)
	index := parts[0]
	if len(parts) == 1 {
		res, err := d.client.Indices.Get([]string{index})
		if err != nil {
			return &db.QueryResult{Error: err.Error()}, nil
		}
		defer res.Body.Close()
		return d.parseGenericResponse(res)
	}
	res, err := d.client.Get(index, parts[1])
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}

func (d *Driver) handleIndex(arg string) (*db.QueryResult, error) {
	parts := strings.SplitN(arg, " ", 2)
	if len(parts) < 2 {
		return &db.QueryResult{Error: "INDEX requires index_name and JSON document"}, nil
	}
	var buf bytes.Buffer
	buf.WriteString(parts[1])

	req := esapi.IndexRequest{Index: parts[0], Body: &buf, Refresh: "true"}
	res, err := req.Do(d.ctx, d.client)
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}

func (d *Driver) handleDelete(arg string) (*db.QueryResult, error) {
	if arg == "" {
		return &db.QueryResult{Error: "DELETE requires index/id"}, nil
	}
	parts := strings.SplitN(arg, "/", 2)
	if len(parts) < 2 {
		res, err := d.client.Indices.Delete([]string{parts[0]})
		if err != nil {
			return &db.QueryResult{Error: err.Error()}, nil
		}
		defer res.Body.Close()
		return d.parseGenericResponse(res)
	}
	res, err := d.client.Delete(parts[0], parts[1])
	if err != nil {
		return &db.QueryResult{Error: err.Error()}, nil
	}
	defer res.Body.Close()
	return d.parseGenericResponse(res)
}
