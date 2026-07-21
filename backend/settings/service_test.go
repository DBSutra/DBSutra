// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package settings

import (
	"encoding/json"
	"os"
	"testing"

	"clientdb/backend/fs"
)

// helper creates a settings.Service backed by a temporary directory.
func newTestService(t *testing.T) (*Service, string) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "settings-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(tmpDir) })

	fsvc := fs.NewServiceWithDir(tmpDir)
	return NewService(fsvc), tmpDir
}

// ---------------------------------------------------------------------------
// NewService
// ---------------------------------------------------------------------------

func TestNewService(t *testing.T) {
	svc, _ := newTestService(t)
	if svc == nil {
		t.Fatal("NewService returned nil")
	}
}

// ---------------------------------------------------------------------------
// LoadSettings
// ---------------------------------------------------------------------------

func TestLoadSettings_NoFile(t *testing.T) {
	svc, _ := newTestService(t)

	settings, err := svc.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings returned error: %v", err)
	}
	if len(settings) != 0 {
		t.Fatalf("expected empty map, got %d keys", len(settings))
	}
}

// ---------------------------------------------------------------------------
// SaveSettings + round-trip
// ---------------------------------------------------------------------------

func TestSaveSettings_WritesJSON(t *testing.T) {
	svc, dir := newTestService(t)

	input := map[string]interface{}{
		"theme":  "dark",
		"editor": "vim",
	}
	if err := svc.SaveSettings(input); err != nil {
		t.Fatalf("SaveSettings returned error: %v", err)
	}

	raw, err := os.ReadFile(dir + "/settings.json")
	if err != nil {
		t.Fatalf("failed to read settings file: %v", err)
	}

	var onDisk map[string]interface{}
	if err := json.Unmarshal(raw, &onDisk); err != nil {
		t.Fatalf("settings file is not valid JSON: %v", err)
	}
	if onDisk["theme"] != "dark" || onDisk["editor"] != "vim" {
		t.Fatalf("unexpected file contents: %s", raw)
	}
}

func TestLoadSettings_ReadsBackSaved(t *testing.T) {
	svc, _ := newTestService(t)

	input := map[string]interface{}{
		"theme":       "light",
		"fontSize":    float64(14), // JSON numbers unmarshal as float64
		"lineNumbers": true,
	}
	if err := svc.SaveSettings(input); err != nil {
		t.Fatalf("SaveSettings returned error: %v", err)
	}

	loaded, err := svc.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings returned error: %v", err)
	}

	for k, want := range input {
		got, ok := loaded[k]
		if !ok {
			t.Errorf("key %q missing from loaded settings", k)
			continue
		}
		if got != want {
			t.Errorf("key %q: got %v (%T), want %v (%T)", k, got, got, want, want)
		}
	}
}

// ---------------------------------------------------------------------------
// LoadLayout
// ---------------------------------------------------------------------------

func TestLoadLayout_NoFile(t *testing.T) {
	svc, _ := newTestService(t)

	layout, err := svc.LoadLayout()
	if err != nil {
		t.Fatalf("LoadLayout returned error: %v", err)
	}
	if layout != "" {
		t.Fatalf("expected empty string, got %q", layout)
	}
}

func TestSaveLayout_Persists(t *testing.T) {
	svc, _ := newTestService(t)

	layoutJSON := `{"panels":[{"id":"query","width":600}]}`
	if err := svc.SaveLayout(layoutJSON); err != nil {
		t.Fatalf("SaveLayout returned error: %v", err)
	}

	got, err := svc.LoadLayout()
	if err != nil {
		t.Fatalf("LoadLayout returned error: %v", err)
	}
	if got != layoutJSON {
		t.Fatalf("layout round-trip failed:\n got: %s\nwant: %s", got, layoutJSON)
	}
}

// ---------------------------------------------------------------------------
// LoadConnections
// ---------------------------------------------------------------------------

func TestLoadConnections_NoFile(t *testing.T) {
	svc, _ := newTestService(t)

	conns, err := svc.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections returned error: %v", err)
	}
	if conns != "[]" {
		t.Fatalf("expected \"[]\", got %q", conns)
	}
}

func TestSaveConnections_Persists(t *testing.T) {
	svc, _ := newTestService(t)

	connectionsJSON := `[{"name":"local","driver":"postgres","host":"localhost","port":5432}]`
	if err := svc.SaveConnections(connectionsJSON); err != nil {
		t.Fatalf("SaveConnections returned error: %v", err)
	}

	got, err := svc.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections returned error: %v", err)
	}
	if got != connectionsJSON {
		t.Fatalf("connections round-trip failed:\n got: %s\nwant: %s", got, connectionsJSON)
	}
}
