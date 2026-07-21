// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package security

import (
	"strings"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// SANITIZE TESTS
// ══════════════════════════════════════════════════════════════════════════════

func TestIsDestructiveQuery(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		wantDestructive bool
	}{
		// ── Destructive queries ────────────────────────────────────────────
		{
			name:            "DROP TABLE",
			query:           "DROP TABLE users",
			wantDestructive: true,
		},
		{
			name:            "DROP TABLE with IF EXISTS",
			query:           "DROP TABLE IF EXISTS users;",
			wantDestructive: true,
		},
		{
			name:            "DROP DATABASE",
			query:           "DROP DATABASE production",
			wantDestructive: true,
		},
		{
			name:            "DROP SCHEMA",
			query:           "DROP SCHEMA public CASCADE",
			wantDestructive: true,
		},
		{
			name:            "TRUNCATE TABLE",
			query:           "TRUNCATE TABLE sessions",
			wantDestructive: true,
		},
		{
			name:            "TRUNCATE without TABLE keyword",
			query:           "TRUNCATE sessions",
			wantDestructive: true,
		},
		{
			name:            "DELETE without WHERE",
			query:           "DELETE FROM users",
			wantDestructive: true,
		},
		{
			name:            "DELETE without WHERE trailing semicolon",
			query:           "DELETE FROM users;",
			wantDestructive: true,
		},
		{
			name:            "ALTER TABLE DROP COLUMN",
			query:           "ALTER TABLE users DROP COLUMN password",
			wantDestructive: true,
		},
		{
			name:            "ALTER TABLE DROP",
			query:           "ALTER TABLE users DROP CONSTRAINT pk_users",
			wantDestructive: true,
		},
		{
			name:            "UPDATE without WHERE",
			query:           "UPDATE users SET active = 0",
			wantDestructive: true,
		},
		{
			name:            "leading whitespace DROP TABLE",
			query:           "   DROP TABLE logs",
			wantDestructive: true,
		},
		{
			name:            "lowercase drop table",
			query:           "drop table users",
			wantDestructive: true,
		},
		{
			name:            "mixed case Drop Table",
			query:           "DrOp TaBlE users",
			wantDestructive: true,
		},
		{
			name:            "DROP INDEX",
			query:           "DROP INDEX idx_users_email",
			wantDestructive: true,
		},
		{
			name:            "DROP VIEW",
			query:           "DROP VIEW active_users",
			wantDestructive: true,
		},

		// ── Safe queries ──────────────────────────────────────────────────
		{
			name:            "SELECT query",
			query:           "SELECT * FROM users WHERE id = 1",
			wantDestructive: false,
		},
		{
			name:            "DELETE with WHERE",
			query:           "DELETE FROM users WHERE id = 42",
			wantDestructive: false,
		},
		{
			name:            "UPDATE with WHERE",
			query:           "UPDATE users SET name = 'Alice' WHERE id = 1",
			wantDestructive: false,
		},
		{
			name:            "INSERT",
			query:           "INSERT INTO users (name) VALUES ('Alice')",
			wantDestructive: false,
		},
		{
			name:            "CREATE TABLE",
			query:           "CREATE TABLE users (id INT PRIMARY KEY)",
			wantDestructive: false,
		},
		{
			name:            "ALTER TABLE ADD COLUMN",
			query:           "ALTER TABLE users ADD COLUMN email VARCHAR(255)",
			wantDestructive: false,
		},
		{
			name:            "empty string",
			query:           "",
			wantDestructive: false,
		},
		{
			name:            "whitespace only",
			query:           "   ",
			wantDestructive: false,
		},
		{
			name:            "SELECT with DROP in string literal",
			query:           "SELECT 'DROP TABLE' FROM users",
			wantDestructive: false,
		},
		{
			name:            "JOIN query",
			query:           "SELECT u.* FROM users u JOIN orders o ON u.id = o.user_id",
			wantDestructive: false,
		},
		{
			name:            "SHOW TABLES",
			query:           "SHOW TABLES",
			wantDestructive: false,
		},
		{
			name:            "DESCRIBE table",
			query:           "DESCRIBE users",
			wantDestructive: false,
		},
		{
			name:            "EXPLAIN query",
			query:           "EXPLAIN SELECT * FROM users",
			wantDestructive: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsDestructiveQuery(tt.query)
			if got != tt.wantDestructive {
				t.Errorf("IsDestructiveQuery(%q) = %v, want %v", tt.query, got, tt.wantDestructive)
			}
		})
	}
}

func TestValidateConnectionConfig(t *testing.T) {
	tests := []struct {
		name    string
		cfg     ConnectionValidationConfig
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid postgres config",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost",
				Port:     5432,
				Database: "mydb",
				Username: "admin",
			},
			wantErr: false,
		},
		{
			name: "valid mysql config",
			cfg: ConnectionValidationConfig{
				Type:     "mysql",
				Host:     "db.example.com",
				Port:     3306,
				Database: "mydb",
				Username: "root",
			},
			wantErr: false,
		},
		{
			name: "valid redis config without database",
			cfg: ConnectionValidationConfig{
				Type: "redis",
				Host: "127.0.0.1",
				Port: 6379,
			},
			wantErr: false,
		},
		{
			name: "valid IP address host",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "192.168.1.100",
				Port:     5432,
				Database: "mydb",
			},
			wantErr: false,
		},
		{
			name: "valid IPv6 address",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "::1",
				Port:     5432,
				Database: "mydb",
			},
			wantErr: false,
		},
		{
			name: "empty host",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "",
				Port:     5432,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "host is required",
		},
		{
			name: "host with semicolon injection",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost; rm -rf /",
				Port:     5432,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "disallowed characters",
		},
		{
			name: "host with pipe injection",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost|cat /etc/passwd",
				Port:     5432,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "disallowed characters",
		},
		{
			name: "port zero",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost",
				Port:     0,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "out of valid range",
		},
		{
			name: "port negative",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost",
				Port:     -1,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "out of valid range",
		},
		{
			name: "port too high",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost",
				Port:     99999,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "out of valid range",
		},
		{
			name: "SSH port (likely misconfiguration)",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost",
				Port:     22,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "system service port",
		},
		{
			name: "database name with SQL injection",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost",
				Port:     5432,
				Database: "mydb'; DROP TABLE users; --",
			},
			wantErr: true,
			errMsg:  "disallowed characters",
		},
		{
			name: "username with SQL injection",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "localhost",
				Port:     5432,
				Database: "mydb",
				Username: "admin'--",
			},
			wantErr: true,
			errMsg:  "disallowed characters",
		},
		{
			name: "missing database for postgres",
			cfg: ConnectionValidationConfig{
				Type: "postgres",
				Host: "localhost",
				Port: 5432,
			},
			wantErr: true,
			errMsg:  "database name is required",
		},
		{
			name: "invalid hostname with special chars",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "host name with spaces",
				Port:     5432,
				Database: "mydb",
			},
			wantErr: true,
			errMsg:  "invalid characters",
		},
		{
			name: "hostname too long",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     string(make([]byte, 300)),
				Port:     5432,
				Database: "mydb",
			},
			wantErr: true,
		},
		{
			name: "elasticsearch without database is OK",
			cfg: ConnectionValidationConfig{
				Type: "elasticsearch",
				Host: "localhost",
				Port: 9200,
			},
			wantErr: false,
		},
		{
			name: "valid hostname with subdomain",
			cfg: ConnectionValidationConfig{
				Type:     "postgres",
				Host:     "db.us-east-1.rds.amazonaws.com",
				Port:     5432,
				Database: "mydb",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateConnectionConfig(tt.cfg)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateConnectionConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && tt.errMsg != "" && err != nil {
				if !contains(err.Error(), tt.errMsg) {
					t.Errorf("ValidateConnectionConfig() error = %q, want error containing %q", err.Error(), tt.errMsg)
				}
			}
		})
	}
}

func TestSanitizeInput(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "normal string",
			input: "hello world",
			want:  "hello world",
		},
		{
			name:  "null bytes removed",
			input: "hello\x00world",
			want:  "helloworld",
		},
		{
			name:  "ANSI escape sequences removed",
			input: "\x1b[31mRED\x1b[0m normal",
			want:  "RED normal",
		},
		{
			name:  "backslashes escaped",
			input: `path\to\file`,
			want:  `path\\to\\file`,
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "string at max length",
			input: strings.Repeat("a", 4096),
			want:  strings.Repeat("a", 4096),
		},
		{
			name:  "string exceeding max length is truncated",
			input: strings.Repeat("a", 5000),
			want:  strings.Repeat("a", 4096) + "...(truncated)",
		},
		{
			name:  "multiple null bytes",
			input: "a\x00b\x00c",
			want:  "abc",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SanitizeInput(tt.input)
			if got != tt.want {
				t.Errorf("SanitizeInput() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestSanitizeIdentifier(t *testing.T) {
	tests := []struct {
		name       string
		identifier string
		want       string
	}{
		{
			name:       "simple table name",
			identifier: "users",
			want:       "`users`",
		},
		{
			name:       "schema qualified",
			identifier: "public.users",
			want:       "`public.users`",
		},
		{
			name:       "backticks stripped",
			identifier: "`users`",
			want:       "`users`",
		},
		{
			name:       "quotes stripped",
			identifier: `"users"`,
			want:       "`users`",
		},
		{
			name:       "SQL injection attempt",
			identifier: "users; DROP TABLE users",
			want:       "`usersDROPTABLEusers`", // semicolons and spaces stripped
		},
		{
			name:       "empty identifier",
			identifier: "",
			want:       "`_invalid_`",
		},
		{
			name:       "only special characters",
			identifier: "';\"--",
			want:       "`_invalid_`",
		},
		{
			name:       "identifier with dollar sign (valid in some DBs)",
			identifier: "col$name",
			want:       "`col$name`",
		},
		{
			name:       "unicode stripped",
			identifier: "usersé",
			want:       "`users`",
		},
		{
			name:       "comment injection",
			identifier: "users/*comment*/",
			want:       "`userscomment`",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SanitizeIdentifier(tt.identifier)
			if got != tt.want {
				t.Errorf("SanitizeIdentifier(%q) = %q, want %q", tt.identifier, got, tt.want)
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchSubstring(s, substr)
}

func searchSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
