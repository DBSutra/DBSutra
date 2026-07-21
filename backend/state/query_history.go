// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import "encoding/json"

// ══════════════════════════════════════════════════════════════════════════════
// QUERY HISTORY
// ══════════════════════════════════════════════════════════════════════════════

// AddQueryHistory records a query execution with LRU semantics
func (s *Service) AddQueryHistory(connID, query, status string, rowCount, durationMs int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Debug("AddQueryHistory: conn=%s status=%s rows=%d duration=%dms query_len=%d",
		connID, status, rowCount, durationMs, len(query))

	tx, err := s.db.Begin()
	if err != nil {
		log.Error("AddQueryHistory: begin tx failed: %v", err)
		return err
	}
	defer tx.Rollback()

	// Delete existing identical query to ensure LRU behavior
	if _, err := tx.Exec("DELETE FROM query_history WHERE conn_id = ? AND query = ?", connID, query); err != nil {
		log.Error("AddQueryHistory: delete existing failed: %v", err)
		return err
	}

	_, err = tx.Exec(
		"INSERT INTO query_history (conn_id, query, status, rows, duration) VALUES (?, ?, ?, ?, ?)",
		connID, query, status, rowCount, durationMs,
	)
	if err != nil {
		log.Error("AddQueryHistory: insert failed: %v", err)
		return err
	}

	// Enforce strict 1000 history limit (LRU)
	_, err = tx.Exec(`
		DELETE FROM query_history
		WHERE id NOT IN (
			SELECT id FROM query_history
			ORDER BY timestamp DESC
			LIMIT 1000
		)
	`)
	if err != nil {
		log.Error("AddQueryHistory: LRU cleanup failed: %v", err)
		return err
	}

	if err := tx.Commit(); err != nil {
		log.Error("AddQueryHistory: commit failed: %v", err)
		return err
	}
	log.Debug("AddQueryHistory: saved OK")
	return nil
}

// LoadQueryHistory retrieves recent query history as JSON
func (s *Service) LoadQueryHistory(limit int) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 {
		limit = 100
	}
	log.Debug("LoadQueryHistory: limit=%d", limit)

	rows, err := s.db.Query(
		"SELECT conn_id, query, status, rows, duration, timestamp FROM query_history ORDER BY timestamp DESC LIMIT ?",
		limit,
	)
	if err != nil {
		log.Error("LoadQueryHistory: query failed: %v", err)
		return "[]", err
	}
	defer rows.Close()

	type HistoryEntry struct {
		ConnID    string `json:"connId"`
		Query     string `json:"query"`
		Status    string `json:"status"`
		Rows      int    `json:"rows"`
		Duration  int    `json:"duration"`
		Timestamp int64  `json:"timestamp"`
	}

	var entries []HistoryEntry
	for rows.Next() {
		var e HistoryEntry
		if err := rows.Scan(&e.ConnID, &e.Query, &e.Status, &e.Rows, &e.Duration, &e.Timestamp); err != nil {
			log.Warn("LoadQueryHistory: scan error: %v", err)
			continue
		}
		entries = append(entries, e)
	}
	if entries == nil {
		log.Debug("LoadQueryHistory: no history found")
		return "[]", nil
	}
	data, err := json.Marshal(entries)
	if err != nil {
		log.Error("LoadQueryHistory: marshal failed: %v", err)
		return "[]", err
	}
	log.Debug("LoadQueryHistory: loaded %d entries", len(entries))
	return string(data), nil
}
