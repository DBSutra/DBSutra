// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package mongodb

import (
	"clientdb/backend/db"
	"fmt"
	"strings"
)

// ══════════════════════════════════════════════════════════════════════════════
// QUERY — MongoDB query parser and dispatcher
// ══════════════════════════════════════════════════════════════════════════════

func (d *Driver) Query(sqlStr string) (*db.QueryResult, error) {
	sqlStr = strings.TrimSpace(sqlStr)
	if sqlStr == "" {
		return &db.QueryResult{Error: "empty query"}, nil
	}
	if strings.HasPrefix(sqlStr, "db.") {
		return d.parseShellCommand(sqlStr)
	}
	return &db.QueryResult{Error: "unsupported MongoDB query format. Use db.collection.find() syntax"}, nil
}

func (d *Driver) parseShellCommand(cmd string) (*db.QueryResult, error) {
	cmd = strings.TrimPrefix(cmd, "db.")
	parts := strings.SplitN(cmd, ".", 2)
	if len(parts) < 2 {
		return &db.QueryResult{Error: "invalid MongoDB command"}, nil
	}
	collection := parts[0]
	rest := parts[1]

	switch {
	case strings.HasPrefix(rest, "find("):
		return d.handleFind(collection, rest)
	case strings.HasPrefix(rest, "findOne("):
		return d.handleFindOne(collection, rest)
	case strings.HasPrefix(rest, "insertOne("):
		return d.handleInsertOne(collection, rest)
	case strings.HasPrefix(rest, "insertMany("):
		return d.handleInsertMany(collection, rest)
	case strings.HasPrefix(rest, "updateOne(") || strings.HasPrefix(rest, "updateMany("):
		return d.handleUpdate(collection, rest)
	case strings.HasPrefix(rest, "deleteOne(") || strings.HasPrefix(rest, "deleteMany("):
		return d.handleDelete(collection, rest)
	case strings.HasPrefix(rest, "countDocuments("):
		return d.handleCount(collection, rest)
	case strings.HasPrefix(rest, "aggregate("):
		return d.handleAggregate(collection, rest)
	case strings.HasPrefix(rest, "drop("):
		return d.handleDrop(collection)
	case strings.HasPrefix(rest, "createCollection("):
		return d.handleCreateCollection(collection)
	default:
		return &db.QueryResult{Error: fmt.Sprintf("unsupported MongoDB operation: %s", rest)}, nil
	}
}

// extractParenContent extracts content between first ( and last )
func (d *Driver) extractParenContent(s string) string {
	start := strings.Index(s, "(")
	end := strings.LastIndex(s, ")")
	if start < 0 || end < 0 || end <= start {
		return ""
	}
	return strings.TrimSpace(s[start+1 : end])
}

// extractJSON extracts JSON content between ( and )
func (d *Driver) extractJSON(s string) string {
	start := strings.Index(s, "(")
	end := strings.LastIndex(s, ")")
	if start < 0 || end < 0 {
		return ""
	}
	return strings.TrimSpace(s[start+1 : end])
}

// extractJSONArray extracts JSON array content between [ and ]
func (d *Driver) extractJSONArray(s string) string {
	start := strings.Index(s, "[")
	end := strings.LastIndex(s, "]")
	if start < 0 || end < 0 {
		return ""
	}
	return s[start : end+1]
}

// extractMethod extracts content from a chained method call like .method(content)
func (d *Driver) extractMethod(rest, method string) string {
	idx := strings.Index(rest, "."+method+"(")
	if idx < 0 {
		return ""
	}
	sub := rest[idx+len(method)+2:]
	start := strings.Index(sub, "(")
	end := strings.Index(sub, ")")
	if start < 0 || end < 0 {
		return ""
	}
	return sub[start+1 : end]
}
