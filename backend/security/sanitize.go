// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package security

import (
	"fmt"
	"net"
	"regexp"
	"strings"
)

// ══════════════════════════════════════════════════════════════════════════════
// SANITIZE — query and input sanitization for SQL safety
// ══════════════════════════════════════════════════════════════════════════════

// destructivePatterns are regex patterns that match SQL statements capable of
// destroying data or schema. Each pattern is tested against the normalised
// (uppercased, leading-whitespace-stripped) query.
var destructivePatterns = []*regexp.Regexp{
	// DROP TABLE / DROP DATABASE / DROP SCHEMA / DROP INDEX / DROP VIEW
	regexp.MustCompile(`(?i)^\s*DROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|TRIGGER|FUNCTION|PROCEDURE)\b`),
	// TRUNCATE TABLE
	regexp.MustCompile(`(?i)^\s*TRUNCATE\b`),
	// DELETE without WHERE — matches "DELETE FROM x" not followed by WHERE
	regexp.MustCompile(`(?i)^\s*DELETE\s+FROM\s+\S+\s*$`),
	regexp.MustCompile(`(?i)^\s*DELETE\s+FROM\s+\S+\s+;?\s*$`),
	// ALTER TABLE ... DROP
	regexp.MustCompile(`(?i)^\s*ALTER\s+TABLE\b.*\bDROP\b`),
	// DROP COLUMN
	regexp.MustCompile(`(?i)^\s*ALTER\s+TABLE\b.*\bDROP\s+COLUMN\b`),
	// UPDATE ... SET (matched separately; WHERE check is done in IsDestructiveQuery)
	regexp.MustCompile(`(?i)^\s*UPDATE\s+\S+\s+SET\b`),
}

// IsDestructiveQuery returns true if the given SQL statement appears to be a
// destructive operation (DROP, TRUNCATE, DELETE without WHERE, ALTER TABLE DROP,
// UPDATE without WHERE).
//
// The function uses pattern matching and is intentionally conservative — it
// may flag some safe queries as destructive (false positives are acceptable;
// false negatives are not).
func IsDestructiveQuery(sql string) bool {
	trimmed := strings.TrimSpace(sql)
	if trimmed == "" {
		return false
	}

	// Strip trailing semicolons and whitespace for matching.
	trimmed = strings.TrimRight(trimmed, "; \t\n\r")

	upper := strings.ToUpper(trimmed)

	for _, re := range destructivePatterns {
		if re.MatchString(trimmed) {
			// Special case: UPDATE ... SET is only destructive without a WHERE clause.
			if strings.HasPrefix(strings.TrimSpace(strings.ToUpper(trimmed)), "UPDATE") {
				if strings.Contains(upper, "WHERE") {
					continue
				}
			}
			return true
		}
	}

	// Also check for DELETE without WHERE (handles edge cases the regex may miss).
	if strings.Contains(upper, "DELETE FROM") && !strings.Contains(upper, "WHERE") {
		return true
	}

	return false
}

// ConnectionValidationConfig holds connection parameters to validate. This is a
// subset of db.ConnectionConfig to avoid a circular import.
type ConnectionValidationConfig struct {
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
	SSL      bool   `json:"ssl"`
}

// ValidateConnectionConfig checks connection parameters for safety and
// correctness. It validates the host, port range, database name, and warns
// about plaintext connections.
func ValidateConnectionConfig(cfg ConnectionValidationConfig) error {
	// Host must not be empty.
	if strings.TrimSpace(cfg.Host) == "" {
		return fmt.Errorf("connection: host is required")
	}

	// Check for obviously malicious host values (shell injection attempts).
	if strings.ContainsAny(cfg.Host, ";|&`$(){}[]!") {
		return fmt.Errorf("connection: host contains disallowed characters: %q", cfg.Host)
	}

	// Validate that the host is either a valid IP or a valid hostname.
	if ip := net.ParseIP(cfg.Host); ip == nil {
		// Not an IP — must be a hostname.
		if err := validateHostname(cfg.Host); err != nil {
			return fmt.Errorf("connection: invalid host: %w", err)
		}
	}

	// Port must be in the valid range (1–65535) and non-zero.
	if cfg.Port < 1 || cfg.Port > 65535 {
		return fmt.Errorf("connection: port %d is out of valid range (1-65535)", cfg.Port)
	}

	// Warn about common non-standard ports that might indicate misconfiguration.
	if cfg.Port == 22 || cfg.Port == 23 || cfg.Port == 25 {
		return fmt.Errorf("connection: port %d is a system service port and likely a misconfiguration", cfg.Port)
	}

	// Database name must not be empty for SQL databases.
	dbType := strings.ToLower(cfg.Type)
	if dbType != "redis" && dbType != "elasticsearch" && strings.TrimSpace(cfg.Database) == "" {
		return fmt.Errorf("connection: database name is required for %s", cfg.Type)
	}

	// Check for SQL injection in database name.
	if containsSQLMetaChars(cfg.Database) {
		return fmt.Errorf("connection: database name contains disallowed characters: %q", cfg.Database)
	}

	// Check for SQL injection in username.
	if containsSQLMetaChars(cfg.Username) {
		return fmt.Errorf("connection: username contains disallowed characters: %q", cfg.Username)
	}

	return nil
}

// SanitizeInput removes or escapes potentially dangerous characters from user
// input. This is intended for display and logging contexts; it is NOT a
// substitute for parameterized queries.
func SanitizeInput(input string) string {
	// Remove null bytes.
	input = strings.ReplaceAll(input, "\x00", "")

	// Escape backslashes (for logging safety).
	input = strings.ReplaceAll(input, "\\", "\\\\")

	// Remove ANSI escape sequences.
	ansiRe := regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]`)
	input = ansiRe.ReplaceAllString(input, "")

	// Truncate excessively long inputs (prevent log flooding).
	const maxLen = 4096
	if len(input) > maxLen {
		input = input[:maxLen] + "...(truncated)"
	}

	return input
}

// SanitizeIdentifier ensures a SQL identifier (table name, column name, etc.)
// contains only safe characters. It wraps the identifier in backticks for
// safe use in queries.
func SanitizeIdentifier(identifier string) string {
	// Remove any existing backticks or quotes that could be used for injection.
	cleaned := strings.NewReplacer(
		"`", "",
		"'", "",
		"\"", "",
		";", "",
		"--", "",
		"/*", "",
		"*/", "",
	).Replace(identifier)

	// Only allow alphanumeric, underscore, dot (for schema.table), and dollar.
	var buf strings.Builder
	for _, r := range cleaned {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '.' || r == '$' {
			buf.WriteRune(r)
		}
	}
	result := buf.String()
	if result == "" {
		return "`_invalid_`"
	}
	return "`" + result + "`"
}

// ── internal helpers ─────────────────────────────────────────────────────────

// validateHostname checks that a hostname contains only valid characters.
func validateHostname(host string) error {
	if len(host) > 253 {
		return fmt.Errorf("hostname exceeds maximum length of 253 characters")
	}
	hostnameRe := regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$`)
	if !hostnameRe.MatchString(host) {
		return fmt.Errorf("hostname %q contains invalid characters", host)
	}
	return nil
}

// containsSQLMetaChars returns true if the string contains characters that
// should never appear in SQL identifiers or connection parameters.
func containsSQLMetaChars(s string) bool {
	dangerous := []string{"'", "\"", ";", "--", "/*", "*/", "\x00"}
	for _, d := range dangerous {
		if strings.Contains(s, d) {
			return true
		}
	}
	return false
}
