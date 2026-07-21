// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import (
	"regexp"
	"strings"
)

// Sanitized returns a copy of ConnectionConfig with sensitive fields masked.
func (c ConnectionConfig) Sanitized() ConnectionConfig {
	s := c
	if s.Password != "" {
		s.Password = "***"
	}
	if s.ConnectionString != "" {
		s.ConnectionString = SanitizeConnectionString(s.ConnectionString)
	}
	if s.SSH != nil {
		sanitizedSSH := s.SSH.Sanitized()
		s.SSH = &sanitizedSSH
	}
	if s.Options != nil {
		opts := make(map[string]string, len(s.Options))
		for k, v := range s.Options {
			lower := strings.ToLower(k)
			if strings.Contains(lower, "password") || strings.Contains(lower, "secret") || strings.Contains(lower, "token") {
				opts[k] = "***"
			} else {
				opts[k] = v
			}
		}
		s.Options = opts
	}
	return s
}

// Sanitized returns a copy of SSHConfig with sensitive fields masked.
func (c SSHConfig) Sanitized() SSHConfig {
	s := c
	if s.Password != "" {
		s.Password = "***"
	}
	if s.KeyPass != "" {
		s.KeyPass = "***"
	}
	return s
}

// connStrPasswordRe matches password=VALUE in connection strings (key=value format).
var connStrPasswordRe = regexp.MustCompile(`(?i)(password)\s*=\s*([^\s;]+)`)

// mongoURIRe matches password in MongoDB-style URIs: user:password@host
var mongoURIRe = regexp.MustCompile(`(://[^:]+:)([^@]+)(@)`)

// mysqlDSNRe matches password in MySQL DSN: user:password@tcp(...)
var mysqlDSNRe = regexp.MustCompile(`(^[^:]+:)([^@]+)(@)`)

// SanitizeConnectionString masks passwords found in common connection string formats.
func SanitizeConnectionString(connStr string) string {
	// PostgreSQL / general key=value format: password=secret
	result := connStrPasswordRe.ReplaceAllString(connStr, "${1}=***")

	// MongoDB URI: mongodb://user:secret@host:port
	result = mongoURIRe.ReplaceAllString(result, "${1}***${3}")

	// MySQL DSN: user:secret@tcp(host:port)/db
	result = mysqlDSNRe.ReplaceAllString(result, "${1}***${3}")

	return result
}
