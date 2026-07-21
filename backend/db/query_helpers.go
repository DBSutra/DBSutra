// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import (
	"database/sql"
	"fmt"
	"strings"

	clog "clientdb/backend/log"
)

var qhLog = clog.New("query")

// ══════════════════════════════════════════════════════════════════════════════
// QUERY HELPERS — shared utilities for all SQL drivers
// ══════════════════════════════════════════════════════════════════════════════

// ExecuteSelectQuery runs a SELECT query and returns the result with proper error handling.
// Used by MySQL, PostgreSQL, and SQLite drivers to avoid code duplication.
func ExecuteSelectQuery(db *sql.DB, driverName, query string) (*QueryResult, error) {
	qhLog.Debug("ExecuteSelectQuery [%s] len=%d", driverName, len(query))
	rows, err := db.Query(query)
	if err != nil {
		qhLog.Error("ExecuteSelectQuery [%s] failed: %v", driverName, err)
		return &QueryResult{Error: WrapQueryError(driverName, query, err).Error()}, nil
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		qhLog.Error("ExecuteSelectQuery [%s] Columns() failed: %v", driverName, err)
		return &QueryResult{Error: WrapQueryError(driverName, query, err).Error()}, nil
	}

	var resultRows [][]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		ptrs := make([]interface{}, len(columns))
		for i := range values {
			ptrs[i] = &values[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			qhLog.Warn("ExecuteSelectQuery [%s] scan error: %v", driverName, err)
			continue
		}
		row := make([]interface{}, len(columns))
		for i, v := range values {
			if b, ok := v.([]byte); ok {
				row[i] = string(b)
			} else {
				row[i] = v
			}
		}
		resultRows = append(resultRows, row)
	}

	qhLog.Debug("ExecuteSelectQuery [%s] OK — %d rows, %d columns", driverName, len(resultRows), len(columns))
	return &QueryResult{Columns: columns, Rows: resultRows}, nil
}

// ExecuteNonQuery runs a non-SELECT query (INSERT, UPDATE, DELETE) and returns affected rows.
func ExecuteNonQuery(db *sql.DB, driverName, query string) (*QueryResult, error) {
	qhLog.Debug("ExecuteNonQuery [%s] len=%d", driverName, len(query))
	result, err := db.Exec(query)
	if err != nil {
		qhLog.Error("ExecuteNonQuery [%s] failed: %v", driverName, err)
		return &QueryResult{Error: WrapQueryError(driverName, query, err).Error()}, nil
	}
	affected, _ := result.RowsAffected()
	qhLog.Debug("ExecuteNonQuery [%s] OK — %d rows affected", driverName, affected)
	return &QueryResult{RowsAffected: affected}, nil
}

// ══════════════════════════════════════════════════════════════════════════════
// IDENTIFIER QUOTING — prevents SQL injection in identifiers
// ══════════════════════════════════════════════════════════════════════════════

// quoteMySQLIdentifier wraps a name in backticks for MySQL
func QuoteMySQL(name string) string {
	return fmt.Sprintf("`%s`", name)
}

// quotePostgresIdentifier wraps a name in double quotes for PostgreSQL
func QuotePostgres(name string) string {
	return fmt.Sprintf(`"%s"`, name)
}

// quoteSQLiteIdentifier wraps a name in double quotes for SQLite
func QuoteSQLite(name string) string {
	return fmt.Sprintf(`"%s"`, name)
}

// buildInsertQuery builds an INSERT query for the given driver
func BuildInsertQuery(driver, database, table string, data map[string]interface{}, quoter func(string) string) (string, []interface{}) {
	var cols []string
	var vals []interface{}
	var placeholders []string
	i := 1
	for k, v := range data {
		cols = append(cols, quoter(k))
		vals = append(vals, v)
		if driver == "postgres" {
			placeholders = append(placeholders, fmt.Sprintf("$%d", i))
			i++
		} else {
			placeholders = append(placeholders, "?")
		}
	}

	var tableName string
	if driver == "mysql" && database != "" {
		tableName = fmt.Sprintf("%s.%s", quoter(database), quoter(table))
	} else {
		tableName = quoter(table)
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", tableName, strings.Join(cols, ", "), strings.Join(placeholders, ", "))
	return query, vals
}

// buildUpdateQuery builds an UPDATE query for the given driver
func BuildUpdateQuery(driver, database, table string, keyColumns, data map[string]interface{}, quoter func(string) string) (string, []interface{}) {
	var setClauses []string
	var vals []interface{}
	i := 1
	for k, v := range data {
		if driver == "postgres" {
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", quoter(k), i))
			i++
		} else {
			setClauses = append(setClauses, fmt.Sprintf("%s = ?", quoter(k)))
		}
		vals = append(vals, v)
	}
	var whereClauses []string
	for k, v := range keyColumns {
		if driver == "postgres" {
			whereClauses = append(whereClauses, fmt.Sprintf("%s = $%d", quoter(k), i))
			i++
		} else {
			whereClauses = append(whereClauses, fmt.Sprintf("%s = ?", quoter(k)))
		}
		vals = append(vals, v)
	}

	var tableName string
	if driver == "mysql" && database != "" {
		tableName = fmt.Sprintf("%s.%s", quoter(database), quoter(table))
	} else {
		tableName = quoter(table)
	}

	query := fmt.Sprintf("UPDATE %s SET %s WHERE %s", tableName, strings.Join(setClauses, ", "), strings.Join(whereClauses, " AND "))
	return query, vals
}

// buildDeleteQuery builds a DELETE query for the given driver
func BuildDeleteQuery(driver, database, table string, keyColumns map[string]interface{}, quoter func(string) string) (string, []interface{}) {
	var whereClauses []string
	var vals []interface{}
	i := 1
	for k, v := range keyColumns {
		if driver == "postgres" {
			whereClauses = append(whereClauses, fmt.Sprintf("%s = $%d", quoter(k), i))
			i++
		} else {
			whereClauses = append(whereClauses, fmt.Sprintf("%s = ?", quoter(k)))
		}
		vals = append(vals, v)
	}

	var tableName string
	if driver == "mysql" && database != "" {
		tableName = fmt.Sprintf("%s.%s", quoter(database), quoter(table))
	} else {
		tableName = quoter(table)
	}

	query := fmt.Sprintf("DELETE FROM %s WHERE %s", tableName, strings.Join(whereClauses, " AND "))
	return query, vals
}
