// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package log

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

// ══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGING — centralized logging for the entire backend
// ══════════════════════════════════════════════════════════════════════════════

// Level represents the severity of a log message
type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
	FATAL
)

var levelNames = map[Level]string{
	DEBUG: "DEBUG",
	INFO:  "INFO",
	WARN:  "WARN",
	ERROR: "ERROR",
	FATAL: "FATAL",
}

var levelColors = map[Level]string{
	DEBUG: "\033[36m", // cyan
	INFO:  "\033[32m", // green
	WARN:  "\033[33m", // yellow
	ERROR: "\033[31m", // red
	FATAL: "\033[35m", // magenta
}

const reset = "\033[0m"

// Logger provides structured logging with module context
type Logger struct {
	module string
}

// New creates a logger for the given module
func New(module string) *Logger {
	return &Logger{module: module}
}

// Global logger for package-level functions
var defaultLogger = New("app")

// SetModule sets the module name for the default logger
func SetModule(module string) {
	defaultLogger = New(module)
}

func (l *Logger) log(level Level, msg string, args ...interface{}) {
	ts := time.Now().Format("15:04:05.000")
	color := levelColors[level]
	name := levelNames[level]

	// Format the message
	formatted := fmt.Sprintf(msg, args...)

	// Build the log line
	line := fmt.Sprintf("%s%s [%s] %s%s%s",
		color, ts, name, l.module, reset, ": "+formatted)

	// Always print to stderr for visibility
	fmt.Fprintln(os.Stderr, line)

	// Also use the standard logger for FATAL
	if level == FATAL {
		log.Fatalf("[%s] %s: %s", name, l.module, formatted)
	}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string, args ...interface{}) {
	l.log(DEBUG, msg, args...)
}

// Info logs an informational message
func (l *Logger) Info(msg string, args ...interface{}) {
	l.log(INFO, msg, args...)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string, args ...interface{}) {
	l.log(WARN, msg, args...)
}

// Error logs an error message
func (l *Logger) Error(msg string, args ...interface{}) {
	l.log(ERROR, msg, args...)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(msg string, args ...interface{}) {
	l.log(FATAL, msg, args...)
}

// WithContext creates a child logger with additional context
func (l *Logger) WithContext(key, value string) *Logger {
	return &Logger{module: fmt.Sprintf("%s[%s=%s]", l.module, key, value)}
}

// ══════════════════════════════════════════════════════════════════════════════
// PACKAGE-LEVEL FUNCTIONS — convenience wrappers for the default logger
// ══════════════════════════════════════════════════════════════════════════════

func Debug(msg string, args ...interface{}) { defaultLogger.Debug(msg, args...) }
func Info(msg string, args ...interface{})  { defaultLogger.Info(msg, args...) }
func Warn(msg string, args ...interface{})  { defaultLogger.Warn(msg, args...) }
func Error(msg string, args ...interface{}) { defaultLogger.Error(msg, args...) }
func Fatal(msg string, args ...interface{}) { defaultLogger.Fatal(msg, args...) }

// ══════════════════════════════════════════════════════════════════════════════
// ERROR FORMATTING HELPERS
// ══════════════════════════════════════════════════════════════════════════════

// FormatError creates a detailed error message with context
func FormatError(op string, err error, context map[string]interface{}) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("%s failed: %v", op, err))
	if len(context) > 0 {
		sb.WriteString(" | context:")
		for k, v := range context {
			sb.WriteString(fmt.Sprintf(" %s=%v", k, v))
		}
	}
	return sb.String()
}

// LogAndReturn logs an error and returns it (for use in error returns)
func LogAndReturn(l *Logger, op string, err error, context map[string]interface{}) error {
	l.Error("%s", FormatError(op, err, context))
	return err
}

// LogAndIgnore logs a non-critical error (for use in defer/cleanup)
func LogAndIgnore(l *Logger, op string, err error) {
	if err != nil {
		l.Warn("%s: %v (ignored)", op, err)
	}
}
