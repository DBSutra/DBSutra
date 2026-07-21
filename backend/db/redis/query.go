// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package redis

import (
	"strings"

	"clientdb/backend/db"
)

func (d *Driver) Query(cmd string) (*db.QueryResult, error) {
	cmd = strings.TrimSpace(cmd)
	if cmd == "" { return &db.QueryResult{Error: "empty command"}, nil }

	parts := parseRedisCommand(cmd)
	if len(parts) == 0 { return &db.QueryResult{Error: "empty command"}, nil }

	command := strings.ToUpper(parts[0])
	args := parts[1:]

	switch command {
	case "GET": return d.handleGet(args)
	case "MGET": return d.handleMGet(args)
	case "SET": return d.handleSet(args)
	case "DEL": return d.handleDel(args)
	case "KEYS": return d.handleKeys(args)
	case "HGETALL": return d.handleHGetAll(args)
	case "HGET": return d.handleHGet(args)
	case "HSET": return d.handleHSet(args)
	case "LPUSH", "RPUSH": return d.handlePush(command, args)
	case "LRANGE": return d.handleLRange(args)
	case "SADD": return d.handleSAdd(args)
	case "SMEMBERS": return d.handleSMembers(args)
	case "TYPE": return d.handleType(args)
	case "TTL": return d.handleTTL(args)
	case "EXISTS": return d.handleExists(args)
	case "INCR", "DECR", "INCRBY", "DECRBY": return d.handleIncr(command, args)
	case "INFO": return d.handleInfo()
	case "DBSIZE": return d.handleDBSize()
	default: return d.handleRawCommand(command, args)
	}
}

func parseRedisCommand(cmd string) []string {
	var parts []string
	var current strings.Builder
	inQuote := false
	quoteChar := byte(0)

	for i := 0; i < len(cmd); i++ {
		ch := cmd[i]
		if inQuote {
			if ch == quoteChar {
				inQuote = false
			} else {
				current.WriteByte(ch)
			}
		} else {
			if ch == '"' || ch == '\'' {
				inQuote = true
				quoteChar = ch
			} else if ch == ' ' || ch == '\t' {
				if current.Len() > 0 {
					parts = append(parts, current.String())
					current.Reset()
				}
			} else {
				current.WriteByte(ch)
			}
		}
	}
	if current.Len() > 0 {
		parts = append(parts, current.String())
	}
	return parts
}
