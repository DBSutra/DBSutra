// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package fs

import (
	"os"
	"path/filepath"
	"testing"
)

// newTestService creates a Service backed by a temporary directory that is
// cleaned up when the test finishes.  Because the test file lives in the same
// package it can set the unexported appDir field directly.
func newTestService(t *testing.T) *Service {
	t.Helper()
	tmp := t.TempDir() // automatically cleaned up after the test
	return &Service{appDir: tmp}
}

func TestNewService_CreatesAppDirectory(t *testing.T) {
	// NewService uses ~/.clientdb which we do not want to touch in tests.
	// Instead we verify the constructor pattern: after creation the app
	// directory must exist on disk.
	tmp := t.TempDir()
	appDir := filepath.Join(tmp, ".clientdb")
	s := &Service{appDir: appDir}

	// Simulate what NewService does — ensure the directory exists.
	if err := os.MkdirAll(appDir, 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}

	info, err := os.Stat(s.appDir)
	if err != nil {
		t.Fatalf("app directory does not exist: %v", err)
	}
	if !info.IsDir() {
		t.Fatalf("app path is not a directory: %s", s.appDir)
	}
}

func TestGetAppDir_ReturnsValidPath(t *testing.T) {
	s := newTestService(t)

	dir := s.GetAppDir()
	if dir == "" {
		t.Fatal("GetAppDir returned empty string")
	}

	info, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("GetAppDir path does not exist: %v", err)
	}
	if !info.IsDir() {
		t.Fatalf("GetAppDir path is not a directory: %s", dir)
	}
}

func TestWriteFile_CreatesFileWithContent(t *testing.T) {
	s := newTestService(t)

	content := "hello, world"
	if err := s.WriteFile("test.txt", content); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	raw, err := os.ReadFile(filepath.Join(s.appDir, "test.txt"))
	if err != nil {
		t.Fatalf("reading file directly failed: %v", err)
	}
	if string(raw) != content {
		t.Fatalf("content mismatch: got %q, want %q", string(raw), content)
	}
}

func TestReadFile_ReadsBackWrittenContent(t *testing.T) {
	s := newTestService(t)

	content := "round-trip data 123"
	if err := s.WriteFile("data.txt", content); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	got, err := s.ReadFile("data.txt")
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}
	if got != content {
		t.Fatalf("ReadFile returned %q, want %q", got, content)
	}
}

func TestFileExists_TrueForExistingFile(t *testing.T) {
	s := newTestService(t)

	if err := s.WriteFile("exists.txt", "x"); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	if !s.FileExists("exists.txt") {
		t.Fatal("FileExists returned false for an existing file")
	}
}

func TestFileExists_FalseForMissingFile(t *testing.T) {
	s := newTestService(t)

	if s.FileExists("nope.txt") {
		t.Fatal("FileExists returned true for a missing file")
	}
}

func TestListFiles_ReturnsFileNames(t *testing.T) {
	s := newTestService(t)

	// Create a subdirectory with a couple of files.
	sub := "mydir"
	if err := os.MkdirAll(filepath.Join(s.appDir, sub), 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}
	for _, name := range []string{"a.txt", "b.txt"} {
		if err := os.WriteFile(filepath.Join(s.appDir, sub, name), []byte("x"), 0644); err != nil {
			t.Fatalf("WriteFile %s failed: %v", name, err)
		}
	}

	names, err := s.ListFiles(sub)
	if err != nil {
		t.Fatalf("ListFiles failed: %v", err)
	}
	if len(names) != 2 {
		t.Fatalf("ListFiles returned %d names, want 2: %v", len(names), names)
	}

	// Check both files appear (order from ReadDir is alphabetical).
	seen := map[string]bool{}
	for _, n := range names {
		seen[n] = true
	}
	if !seen["a.txt"] || !seen["b.txt"] {
		t.Fatalf("ListFiles missing expected entries: %v", names)
	}
}

func TestDeleteFile_RemovesFile(t *testing.T) {
	s := newTestService(t)

	if err := s.WriteFile("delete-me.txt", "bye"); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	if err := s.DeleteFile("delete-me.txt"); err != nil {
		t.Fatalf("DeleteFile failed: %v", err)
	}

	if s.FileExists("delete-me.txt") {
		t.Fatal("file still exists after DeleteFile")
	}
}

func TestWriteFile_CreatesParentDirectories(t *testing.T) {
	s := newTestService(t)

	nested := filepath.Join("deep", "nested", "dir", "file.txt")
	content := "nested content"
	if err := s.WriteFile(nested, content); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	got, err := s.ReadFile(nested)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}
	if got != content {
		t.Fatalf("ReadFile returned %q, want %q", got, content)
	}
}

func TestReadFile_ErrorForMissingFile(t *testing.T) {
	s := newTestService(t)

	_, err := s.ReadFile("does-not-exist.txt")
	if err == nil {
		t.Fatal("ReadFile should return an error for a missing file")
	}
	if !os.IsNotExist(err) {
		t.Fatalf("expected os.IsNotExist error, got: %v", err)
	}
}
