// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package log

import (
	"errors"
	"os"
	"strings"
	"testing"
)

// captureStderr runs fn while capturing everything written to os.Stderr,
// then returns the captured text.
func captureStderr(t *testing.T, fn func()) string {
	t.Helper()

	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe: %v", err)
	}

	// Save the real stderr and point it at our pipe.
	oldStderr := os.Stderr
	os.Stderr = w

	fn()

	w.Close()
	os.Stderr = oldStderr

	var buf [4096]byte
	n, _ := r.Read(buf[:])
	return string(buf[:n])
}

// ── New ──────────────────────────────────────────────────────────────────────

func TestNewCreatesLoggerWithModuleName(t *testing.T) {
	l := New("mymodule")
	if l == nil {
		t.Fatal("New returned nil")
	}
	if l.module != "mymodule" {
		t.Errorf("module = %q, want %q", l.module, "mymodule")
	}
}

// ── Debug / Info / Warn / Error ──────────────────────────────────────────────

func TestDebugOutputsToStderr(t *testing.T) {
	l := New("testmod")
	out := captureStderr(t, func() {
		l.Debug("hello %s", "world")
	})
	if !strings.Contains(out, "DEBUG") {
		t.Errorf("stderr missing DEBUG level: %q", out)
	}
	if !strings.Contains(out, "testmod") {
		t.Errorf("stderr missing module name: %q", out)
	}
	if !strings.Contains(out, "hello world") {
		t.Errorf("stderr missing formatted message: %q", out)
	}
}

func TestInfoOutputsToStderr(t *testing.T) {
	l := New("infomod")
	out := captureStderr(t, func() {
		l.Info("status=%d", 200)
	})
	if !strings.Contains(out, "INFO") {
		t.Errorf("stderr missing INFO level: %q", out)
	}
	if !strings.Contains(out, "status=200") {
		t.Errorf("stderr missing formatted message: %q", out)
	}
}

func TestWarnOutputsToStderr(t *testing.T) {
	l := New("warnmod")
	out := captureStderr(t, func() {
		l.Warn("disk usage %d%%", 95)
	})
	if !strings.Contains(out, "WARN") {
		t.Errorf("stderr missing WARN level: %q", out)
	}
	if !strings.Contains(out, "disk usage 95%") {
		t.Errorf("stderr missing formatted message: %q", out)
	}
}

func TestErrorOutputsToStderr(t *testing.T) {
	l := New("errmod")
	out := captureStderr(t, func() {
		l.Error("connection refused: %s", "localhost:5432")
	})
	if !strings.Contains(out, "ERROR") {
		t.Errorf("stderr missing ERROR level: %q", out)
	}
	if !strings.Contains(out, "connection refused: localhost:5432") {
		t.Errorf("stderr missing formatted message: %q", out)
	}
}

// Fatal calls log.Fatalf which calls os.Exit(1), so it cannot be tested
// in a normal unit test without killing the test process.

// ── WithContext ──────────────────────────────────────────────────────────────

func TestWithContextCreatesChildLogger(t *testing.T) {
	parent := New("parent")
	child := parent.WithContext("req", "abc123")

	if child == nil {
		t.Fatal("WithContext returned nil")
	}
	if child == parent {
		t.Fatal("WithContext must return a new Logger, not the receiver")
	}
	if child.module != "parent[req=abc123]" {
		t.Errorf("child module = %q, want %q", child.module, "parent[req=abc123]")
	}
}

func TestWithContextChildLogsCorrectly(t *testing.T) {
	parent := New("svc")
	child := parent.WithContext("tx", "42")

	out := captureStderr(t, func() {
		child.Info("committing")
	})
	if !strings.Contains(out, "svc[tx=42]") {
		t.Errorf("stderr missing child module: %q", out)
	}
	if !strings.Contains(out, "committing") {
		t.Errorf("stderr missing message: %q", out)
	}
}

func TestWithContextChaining(t *testing.T) {
	l := New("app").WithContext("user", "alice").WithContext("op", "save")
	if l.module != "app[user=alice][op=save]" {
		t.Errorf("chained module = %q, want %q", l.module, "app[user=alice][op=save]")
	}
}

// ── FormatError ─────────────────────────────────────────────────────────────

func TestFormatErrorIncludesOperationAndError(t *testing.T) {
	err := errors.New("timeout")
	msg := FormatError("query", err, nil)

	if !strings.Contains(msg, "query") {
		t.Errorf("FormatError missing operation: %q", msg)
	}
	if !strings.Contains(msg, "timeout") {
		t.Errorf("FormatError missing error text: %q", msg)
	}
	if !strings.Contains(msg, "failed") {
		t.Errorf("FormatError missing 'failed' keyword: %q", msg)
	}
}

func TestFormatErrorIncludesContext(t *testing.T) {
	err := errors.New("refused")
	ctx := map[string]interface{}{
		"host": "db.local",
		"port": 5432,
	}
	msg := FormatError("connect", err, ctx)

	if !strings.Contains(msg, "connect failed") {
		t.Errorf("FormatError missing prefix: %q", msg)
	}
	if !strings.Contains(msg, "refused") {
		t.Errorf("FormatError missing error: %q", msg)
	}
	if !strings.Contains(msg, "context:") {
		t.Errorf("FormatError missing context label: %q", msg)
	}
	if !strings.Contains(msg, "host=db.local") {
		t.Errorf("FormatError missing host context: %q", msg)
	}
	if !strings.Contains(msg, "port=5432") {
		t.Errorf("FormatError missing port context: %q", msg)
	}
}

func TestFormatErrorEmptyContext(t *testing.T) {
	err := errors.New("boom")
	msg := FormatError("deploy", err, map[string]interface{}{})

	if strings.Contains(msg, "context") {
		t.Errorf("FormatError should omit context when map is empty: %q", msg)
	}
}

// ── LogAndReturn ────────────────────────────────────────────────────────────

func TestLogAndReturnLogsAndReturnsError(t *testing.T) {
	l := New("retmod")
	origErr := errors.New("write failed")

	out := captureStderr(t, func() {
		returned := LogAndReturn(l, "save", origErr, map[string]interface{}{"id": 7})
		if returned != origErr {
			t.Errorf("returned error %v, want %v", returned, origErr)
		}
	})

	if !strings.Contains(out, "ERROR") {
		t.Errorf("stderr missing ERROR level: %q", out)
	}
	if !strings.Contains(out, "save") {
		t.Errorf("stderr missing operation: %q", out)
	}
	if !strings.Contains(out, "write failed") {
		t.Errorf("stderr missing error text: %q", out)
	}
	if !strings.Contains(out, "id=7") {
		t.Errorf("stderr missing context: %q", out)
	}
}

func TestLogAndReturnNilContext(t *testing.T) {
	l := New("retmod2")
	origErr := errors.New("oops")

	out := captureStderr(t, func() {
		returned := LogAndReturn(l, "read", origErr, nil)
		if returned != origErr {
			t.Errorf("returned error %v, want %v", returned, origErr)
		}
	})

	if !strings.Contains(out, "read failed") {
		t.Errorf("stderr missing formatted error: %q", out)
	}
}

// ── LogAndIgnore ────────────────────────────────────────────────────────────

func TestLogAndIgnoreLogsWarningForNonNilError(t *testing.T) {
	l := New("ignmod")
	err := errors.New("cleanup failed")

	out := captureStderr(t, func() {
		LogAndIgnore(l, "defer-close", err)
	})

	if !strings.Contains(out, "WARN") {
		t.Errorf("stderr missing WARN level: %q", out)
	}
	if !strings.Contains(out, "defer-close") {
		t.Errorf("stderr missing operation: %q", out)
	}
	if !strings.Contains(out, "cleanup failed") {
		t.Errorf("stderr missing error text: %q", out)
	}
	if !strings.Contains(out, "ignored") {
		t.Errorf("stderr missing '(ignored)': %q", out)
	}
}

func TestLogAndIgnoreDoesNothingForNilError(t *testing.T) {
	l := New("ignmod2")

	out := captureStderr(t, func() {
		LogAndIgnore(l, "defer-close", nil)
	})

	if len(strings.TrimSpace(out)) != 0 {
		t.Errorf("expected no stderr output for nil error, got: %q", out)
	}
}
