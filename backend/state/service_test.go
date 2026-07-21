// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package state

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

// ── helpers ──────────────────────────────────────────────────────────────────

// newTestService creates an in-memory Service for testing with a randomly
// generated encryption key (bypasses OS keychain), failing the test on error.
func newTestService(t *testing.T) *Service {
	t.Helper()
	svc, err := newServiceForTest(":memory:")
	if err != nil {
		t.Fatalf("newServiceForTest(\":memory:\") failed: %v", err)
	}
	t.Cleanup(func() { svc.Close() })
	return svc
}

// ── 1. NewService ────────────────────────────────────────────────────────────

func TestNewService_CreatesSuccessfully(t *testing.T) {
	svc, err := newServiceForTest(":memory:")
	if err != nil {
		t.Fatalf("newServiceForTest returned error: %v", err)
	}
	if svc == nil {
		t.Fatal("NewService returned nil service")
	}
	if svc.db == nil {
		t.Fatal("service.db is nil after construction")
	}
	svc.Close()
}

// ── 2. migrate() — table existence ───────────────────────────────────────────

func TestMigrate_CreatesAllExpectedTables(t *testing.T) {
	svc := newTestService(t)

	expectedTables := []string{
		"kv_store",
		"appearance",
		"fonts",
		"panel_config",
		"dock_layout",
		"shortcuts",
		"color_overrides",
		"connections",
		"query_history",
		"themes",
	}

	for _, tbl := range expectedTables {
		var count int
		err := svc.db.QueryRow(
			"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", tbl,
		).Scan(&count)
		if err != nil {
			t.Errorf("sqlite_master query for table %q failed: %v", tbl, err)
			continue
		}
		if count != 1 {
			t.Errorf("expected table %q to exist, got count=%d", tbl, count)
		}
	}
}

// ── 3. Close() ───────────────────────────────────────────────────────────────

func TestClose_ClosesDatabase(t *testing.T) {
	svc, err := newServiceForTest(":memory:")
	if err != nil {
		t.Fatalf("newServiceForTest failed: %v", err)
	}

	if err := svc.Close(); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}

	// Operations after Close should fail.
	err = svc.db.Ping()
	if err == nil {
		t.Error("expected Ping to fail after Close, but it succeeded")
	}
}

func TestClose_Idempotent(t *testing.T) {
	svc, err := newServiceForTest(":memory:")
	if err != nil {
		t.Fatalf("newServiceForTest failed: %v", err)
	}
	svc.Close()
	// Second close should not panic (may or may not return error).
	_ = svc.Close()
}

// ── 4. KV store operations (tested via appearance table) ─────────────────────

func TestKV_SetAndGet(t *testing.T) {
	svc := newTestService(t)

	if err := svc.setKV("appearance", "theme", "dark"); err != nil {
		t.Fatalf("setKV failed: %v", err)
	}

	val, err := svc.getKV("appearance", "theme")
	if err != nil {
		t.Fatalf("getKV failed: %v", err)
	}
	if val != "dark" {
		t.Errorf("getKV returned %q, want %q", val, "dark")
	}
}

func TestKV_SetOverwrite(t *testing.T) {
	svc := newTestService(t)

	svc.setKV("appearance", "theme", "dark")
	svc.setKV("appearance", "theme", "light")

	val, _ := svc.getKV("appearance", "theme")
	if val != "light" {
		t.Errorf("after overwrite got %q, want %q", val, "light")
	}
}

func TestKV_GetMissingKey(t *testing.T) {
	svc := newTestService(t)

	val, err := svc.getKV("appearance", "nonexistent")
	if err != nil {
		t.Fatalf("getKV for missing key should not error, got: %v", err)
	}
	if val != "" {
		t.Errorf("getKV for missing key returned %q, want empty string", val)
	}
}

func TestKV_Delete(t *testing.T) {
	svc := newTestService(t)

	svc.setKV("appearance", "theme", "dark")
	if err := svc.deleteKV("appearance", "theme"); err != nil {
		t.Fatalf("deleteKV failed: %v", err)
	}

	val, _ := svc.getKV("appearance", "theme")
	if val != "" {
		t.Errorf("after delete, getKV returned %q, want empty", val)
	}
}

func TestKV_DeleteNonexistent(t *testing.T) {
	svc := newTestService(t)

	// Deleting a key that doesn't exist should not error.
	if err := svc.deleteKV("appearance", "ghost"); err != nil {
		t.Fatalf("deleteKV on nonexistent key returned error: %v", err)
	}
}

func TestKV_LoadAll(t *testing.T) {
	svc := newTestService(t)

	svc.setKV("appearance", "theme", "dark")
	svc.setKV("appearance", "sidebar", "left")
	svc.setKV("appearance", "fontSize", "14")

	all, err := svc.loadAllKV("appearance")
	if err != nil {
		t.Fatalf("loadAllKV failed: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("loadAllKV returned %d entries, want 3", len(all))
	}
	if all["theme"] != "dark" {
		t.Errorf("all[theme]=%q, want %q", all["theme"], "dark")
	}
	if all["sidebar"] != "left" {
		t.Errorf("all[sidebar]=%q, want %q", all["sidebar"], "left")
	}
}

func TestKV_LoadAllEmpty(t *testing.T) {
	svc := newTestService(t)

	all, err := svc.loadAllKV("appearance")
	if err != nil {
		t.Fatalf("loadAllKV failed: %v", err)
	}
	if len(all) != 0 {
		t.Errorf("loadAllKV on empty table returned %d entries, want 0", len(all))
	}
}

func TestKV_IsolationBetweenTables(t *testing.T) {
	svc := newTestService(t)

	svc.setKV("appearance", "key1", "from_appearance")
	svc.setKV("fonts", "key1", "from_fonts")

	v1, _ := svc.getKV("appearance", "key1")
	v2, _ := svc.getKV("fonts", "key1")
	if v1 != "from_appearance" || v2 != "from_fonts" {
		t.Errorf("table isolation broken: appearance=%q, fonts=%q", v1, v2)
	}
}

// ── 5. Connection persistence ────────────────────────────────────────────────

func TestConnection_SaveAndLoad(t *testing.T) {
	svc := newTestService(t)

	config := `{"host":"localhost","port":5432,"database":"testdb"}`
	if err := svc.SaveConnection("pg-1", "My Postgres", "postgres", config); err != nil {
		t.Fatalf("SaveConnection failed: %v", err)
	}

	raw, err := svc.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed: %v", err)
	}

	var configs []json.RawMessage
	if err := json.Unmarshal([]byte(raw), &configs); err != nil {
		t.Fatalf("LoadConnections returned invalid JSON: %v", err)
	}
	if len(configs) != 1 {
		t.Fatalf("expected 1 connection, got %d", len(configs))
	}
	// Compare as parsed JSON (key order may differ after serialization)
	var got, want map[string]interface{}
	json.Unmarshal(configs[0], &got)
	json.Unmarshal([]byte(config), &want)
	if fmt.Sprintf("%v", got) != fmt.Sprintf("%v", want) {
		t.Errorf("connection config mismatch: got %v, want %v", got, want)
	}
}

func TestConnection_Upsert(t *testing.T) {
	svc := newTestService(t)

	svc.SaveConnection("pg-1", "Original", "postgres", `{"host":"a"}`)
	svc.SaveConnection("pg-1", "Updated", "postgres", `{"host":"b"}`)

	raw, _ := svc.LoadConnections()
	var configs []json.RawMessage
	json.Unmarshal([]byte(raw), &configs)

	if len(configs) != 1 {
		t.Fatalf("expected 1 connection after upsert, got %d", len(configs))
	}
	// The config should reflect the second write.
	if string(configs[0]) != `{"host":"b"}` {
		t.Errorf("upsert did not update config: %s", string(configs[0]))
	}
}

func TestConnection_Delete(t *testing.T) {
	svc := newTestService(t)

	svc.SaveConnection("pg-1", "DB1", "postgres", `{}`)
	svc.SaveConnection("pg-2", "DB2", "mysql", `{}`)

	if err := svc.DeleteConnection("pg-1"); err != nil {
		t.Fatalf("DeleteConnection failed: %v", err)
	}

	raw, _ := svc.LoadConnections()
	var configs []json.RawMessage
	json.Unmarshal([]byte(raw), &configs)

	if len(configs) != 1 {
		t.Fatalf("expected 1 connection after delete, got %d", len(configs))
	}
}

func TestConnection_DeleteNonexistent(t *testing.T) {
	svc := newTestService(t)

	// Deleting a non-existent connection should not error.
	if err := svc.DeleteConnection("no-such-id"); err != nil {
		t.Fatalf("DeleteConnection on nonexistent id returned error: %v", err)
	}
}

func TestConnection_LoadEmpty(t *testing.T) {
	svc := newTestService(t)

	raw, err := svc.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections on empty table failed: %v", err)
	}
	if raw != "[]" {
		t.Errorf("LoadConnections on empty table returned %q, want \"[]\"", raw)
	}
}

// ── 6. Query history CRUD ────────────────────────────────────────────────────

func TestQueryHistory_AddAndLoad(t *testing.T) {
	svc := newTestService(t)

	if err := svc.AddQueryHistory("conn-1", "SELECT 1", "success", 1, 5); err != nil {
		t.Fatalf("AddQueryHistory failed: %v", err)
	}

	raw, err := svc.LoadQueryHistory(10)
	if err != nil {
		t.Fatalf("LoadQueryHistory failed: %v", err)
	}

	type entry struct {
		ConnID   string `json:"connId"`
		Query    string `json:"query"`
		Status   string `json:"status"`
		Rows     int    `json:"rows"`
		Duration int    `json:"duration"`
	}
	var entries []entry
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		t.Fatalf("LoadQueryHistory returned invalid JSON: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 history entry, got %d", len(entries))
	}
	if entries[0].Query != "SELECT 1" {
		t.Errorf("query = %q, want %q", entries[0].Query, "SELECT 1")
	}
	if entries[0].Status != "success" {
		t.Errorf("status = %q, want %q", entries[0].Status, "success")
	}
	if entries[0].Rows != 1 {
		t.Errorf("rows = %d, want 1", entries[0].Rows)
	}
	if entries[0].Duration != 5 {
		t.Errorf("duration = %d, want 5", entries[0].Duration)
	}
}

func TestQueryHistory_LRUDedup(t *testing.T) {
	svc := newTestService(t)

	// Adding the same query for the same conn should replace (LRU).
	svc.AddQueryHistory("conn-1", "SELECT 1", "success", 1, 5)
	svc.AddQueryHistory("conn-1", "SELECT 1", "success", 2, 10)

	raw, _ := svc.LoadQueryHistory(100)
	type entry struct {
		Rows     int `json:"rows"`
		Duration int `json:"duration"`
	}
	var entries []entry
	json.Unmarshal([]byte(raw), &entries)

	if len(entries) != 1 {
		t.Fatalf("expected 1 entry after LRU dedup, got %d", len(entries))
	}
	// Should reflect the latest insert.
	if entries[0].Rows != 2 || entries[0].Duration != 10 {
		t.Errorf("LRU dedup did not keep latest: rows=%d duration=%d", entries[0].Rows, entries[0].Duration)
	}
}

func TestQueryHistory_MultipleEntries(t *testing.T) {
	svc := newTestService(t)

	svc.AddQueryHistory("c1", "SELECT 1", "success", 1, 5)
	svc.AddQueryHistory("c1", "SELECT 2", "success", 2, 8)
	svc.AddQueryHistory("c2", "INSERT INTO t VALUES (1)", "success", 0, 3)

	raw, _ := svc.LoadQueryHistory(100)
	type entry struct {
		ConnID string `json:"connId"`
		Query  string `json:"query"`
	}
	var entries []entry
	json.Unmarshal([]byte(raw), &entries)

	if len(entries) != 3 {
		t.Fatalf("expected 3 history entries, got %d", len(entries))
	}
}

func TestQueryHistory_LoadEmpty(t *testing.T) {
	svc := newTestService(t)

	raw, err := svc.LoadQueryHistory(100)
	if err != nil {
		t.Fatalf("LoadQueryHistory on empty table failed: %v", err)
	}
	if raw != "[]" {
		t.Errorf("LoadQueryHistory on empty table returned %q, want \"[]\"", raw)
	}
}

func TestQueryHistory_DefaultLimit(t *testing.T) {
	svc := newTestService(t)

	for i := 0; i < 5; i++ {
		svc.AddQueryHistory("c1", "SELECT "+string(rune('A'+i)), "success", 0, 0)
	}

	// Passing limit <= 0 should default to 100, returning all 5.
	raw, err := svc.LoadQueryHistory(0)
	if err != nil {
		t.Fatalf("LoadQueryHistory(0) failed: %v", err)
	}
	type entry struct{ Query string }
	var entries []entry
	json.Unmarshal([]byte(raw), &entries)
	if len(entries) != 5 {
		t.Errorf("LoadQueryHistory(0) returned %d entries, want 5", len(entries))
	}
}

// ── 7. Theme CRUD ────────────────────────────────────────────────────────────

func TestTheme_SaveAndLoad(t *testing.T) {
	svc := newTestService(t)

	colors := `{"bg":"#000","fg":"#fff"}`
	if err := svc.SaveTheme("theme-1", "Dark", colors, true); err != nil {
		t.Fatalf("SaveTheme failed: %v", err)
	}

	raw, err := svc.LoadThemes()
	if err != nil {
		t.Fatalf("LoadThemes failed: %v", err)
	}

	var themes []ThemeRow
	if err := json.Unmarshal([]byte(raw), &themes); err != nil {
		t.Fatalf("LoadThemes returned invalid JSON: %v", err)
	}
	if len(themes) != 1 {
		t.Fatalf("expected 1 theme, got %d", len(themes))
	}
	if themes[0].ID != "theme-1" {
		t.Errorf("theme ID = %q, want %q", themes[0].ID, "theme-1")
	}
	if themes[0].Name != "Dark" {
		t.Errorf("theme Name = %q, want %q", themes[0].Name, "Dark")
	}
	if !themes[0].IsBuiltin {
		t.Error("expected IsBuiltin=true")
	}
	if themes[0].Colors["bg"] != "#000" {
		t.Errorf("colors[bg] = %q, want %q", themes[0].Colors["bg"], "#000")
	}
}

func TestTheme_Upsert(t *testing.T) {
	svc := newTestService(t)

	svc.SaveTheme("t1", "Original", `{"a":"1"}`, false)
	svc.SaveTheme("t1", "Updated", `{"a":"2"}`, false)

	raw, _ := svc.LoadThemes()
	var themes []ThemeRow
	json.Unmarshal([]byte(raw), &themes)

	if len(themes) != 1 {
		t.Fatalf("expected 1 theme after upsert, got %d", len(themes))
	}
	if themes[0].Name != "Updated" {
		t.Errorf("theme name = %q, want %q", themes[0].Name, "Updated")
	}
	if themes[0].Colors["a"] != "2" {
		t.Errorf("colors[a] = %q, want %q", themes[0].Colors["a"], "2")
	}
}

func TestTheme_Delete_NonBuiltin(t *testing.T) {
	svc := newTestService(t)

	svc.SaveTheme("t1", "Custom", `{}`, false)
	if err := svc.DeleteTheme("t1"); err != nil {
		t.Fatalf("DeleteTheme failed: %v", err)
	}

	raw, _ := svc.LoadThemes()
	var themes []ThemeRow
	json.Unmarshal([]byte(raw), &themes)
	if len(themes) != 0 {
		t.Errorf("expected 0 themes after delete, got %d", len(themes))
	}
}

func TestTheme_Delete_BuiltinProtected(t *testing.T) {
	svc := newTestService(t)

	svc.SaveTheme("t1", "Builtin", `{}`, true)
	if err := svc.DeleteTheme("t1"); err != nil {
		t.Fatalf("DeleteTheme returned error: %v", err)
	}

	// Builtin themes should NOT be deleted.
	raw, _ := svc.LoadThemes()
	var themes []ThemeRow
	json.Unmarshal([]byte(raw), &themes)
	if len(themes) != 1 {
		t.Errorf("expected builtin theme to survive delete, got %d themes", len(themes))
	}
}

func TestTheme_LoadEmpty(t *testing.T) {
	svc := newTestService(t)

	raw, err := svc.LoadThemes()
	if err != nil {
		t.Fatalf("LoadThemes on empty table failed: %v", err)
	}
	if raw != "[]" {
		t.Errorf("LoadThemes on empty table returned %q, want \"[]\"", raw)
	}
}

// ── 8. Shortcut persistence ──────────────────────────────────────────────────

func TestShortcut_SaveAndLoad(t *testing.T) {
	svc := newTestService(t)

	if err := svc.SaveShortcut("cmd.open", "Ctrl+O"); err != nil {
		t.Fatalf("SaveShortcut failed: %v", err)
	}

	raw, err := svc.LoadAllShortcuts()
	if err != nil {
		t.Fatalf("LoadAllShortcuts failed: %v", err)
	}

	var shortcuts map[string]string
	if err := json.Unmarshal([]byte(raw), &shortcuts); err != nil {
		t.Fatalf("LoadAllShortcuts returned invalid JSON: %v", err)
	}
	if shortcuts["cmd.open"] != "Ctrl+O" {
		t.Errorf("shortcut[cmd.open] = %q, want %q", shortcuts["cmd.open"], "Ctrl+O")
	}
}

func TestShortcut_Upsert(t *testing.T) {
	svc := newTestService(t)

	svc.SaveShortcut("cmd.open", "Ctrl+O")
	svc.SaveShortcut("cmd.open", "Cmd+O")

	raw, _ := svc.LoadAllShortcuts()
	var shortcuts map[string]string
	json.Unmarshal([]byte(raw), &shortcuts)

	if shortcuts["cmd.open"] != "Cmd+O" {
		t.Errorf("after upsert got %q, want %q", shortcuts["cmd.open"], "Cmd+O")
	}
}

func TestShortcut_Multiple(t *testing.T) {
	svc := newTestService(t)

	svc.SaveShortcut("cmd.open", "Ctrl+O")
	svc.SaveShortcut("cmd.save", "Ctrl+S")
	svc.SaveShortcut("cmd.quit", "Ctrl+Q")

	raw, _ := svc.LoadAllShortcuts()
	var shortcuts map[string]string
	json.Unmarshal([]byte(raw), &shortcuts)

	if len(shortcuts) != 3 {
		t.Errorf("expected 3 shortcuts, got %d", len(shortcuts))
	}
	if shortcuts["cmd.save"] != "Ctrl+S" {
		t.Errorf("shortcut[cmd.save] = %q, want %q", shortcuts["cmd.save"], "Ctrl+S")
	}
}

func TestShortcut_LoadEmpty(t *testing.T) {
	svc := newTestService(t)

	raw, err := svc.LoadAllShortcuts()
	if err != nil {
		t.Fatalf("LoadAllShortcuts on empty table failed: %v", err)
	}
	if raw != "{}" {
		t.Errorf("LoadAllShortcuts on empty table returned %q, want \"{}\"", raw)
	}
}

// ── Edge-case: nil db after close ────────────────────────────────────────────

func TestNewService_BadPath(t *testing.T) {
	// A path that is unlikely to be valid for SQLite file creation.
	_, err := NewService("/nonexistent/deeply/nested/path/db.sqlite")
	if err == nil {
		t.Error("expected NewService with invalid path to return an error")
	}
}

// ── 9. Encrypted connection passwords ─────────────────────────────────────

func TestConnection_PasswordEncrypted(t *testing.T) {
	svc := newTestService(t)

	config := `{"host":"localhost","port":5432,"database":"testdb","password":"my-secret-pw"}`
	if err := svc.SaveConnection("pg-enc", "Encrypted PG", "postgres", config); err != nil {
		t.Fatalf("SaveConnection failed: %v", err)
	}

	// Read the raw config from SQLite to verify the password is not stored in plaintext.
	var rawConfig string
	err := svc.db.QueryRow("SELECT config FROM connections WHERE id = ?", "pg-enc").Scan(&rawConfig)
	if err != nil {
		t.Fatalf("raw query failed: %v", err)
	}

	if strings.Contains(rawConfig, `"password":"my-secret-pw"`) {
		t.Error("password is stored in plaintext in SQLite — expected encrypted form")
	}

	if !strings.Contains(rawConfig, "enc:v1:") {
		t.Error("encrypted password does not have enc:v1: prefix")
	}

	// Now load via the API and verify the password is transparently decrypted.
	loaded, err := svc.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed: %v", err)
	}

	if !strings.Contains(loaded, "my-secret-pw") {
		t.Error("LoadConnections did not decrypt the password")
	}
	if strings.Contains(loaded, "enc:v1:") {
		t.Error("LoadConnections returned encrypted prefix to caller")
	}
}

func TestConnection_SSHPasswordEncrypted(t *testing.T) {
	svc := newTestService(t)

	config := `{"host":"db.example.com","port":3306,"database":"mydb","password":"dbpass","ssh":{"host":"bastion.example.com","user":"admin","password":"ssh-secret-pass"}}`
	if err := svc.SaveConnection("mysql-ssh", "MySQL via SSH", "mysql", config); err != nil {
		t.Fatalf("SaveConnection failed: %v", err)
	}

	// Verify both passwords are encrypted in raw storage.
	var rawConfig string
	err := svc.db.QueryRow("SELECT config FROM connections WHERE id = ?", "mysql-ssh").Scan(&rawConfig)
	if err != nil {
		t.Fatalf("raw query failed: %v", err)
	}

	if strings.Contains(rawConfig, `"dbpass"`) {
		t.Error("db password is stored in plaintext")
	}
	if strings.Contains(rawConfig, `"ssh-secret-pass"`) {
		t.Error("ssh password is stored in plaintext")
	}

	// Verify transparent decryption on load.
	loaded, err := svc.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed: %v", err)
	}

	if !strings.Contains(loaded, "dbpass") {
		t.Error("LoadConnections did not decrypt the db password")
	}
	if !strings.Contains(loaded, "ssh-secret-pass") {
		t.Error("LoadConnections did not decrypt the ssh password")
	}
}

func TestConnection_NoPasswordStaysPlaintext(t *testing.T) {
	svc := newTestService(t)

	config := `{"host":"localhost","port":5432,"database":"testdb"}`
	if err := svc.SaveConnection("pg-plain", "Plain PG", "postgres", config); err != nil {
		t.Fatalf("SaveConnection failed: %v", err)
	}

	// Read raw config — should be identical since no password to encrypt.
	var rawConfig string
	err := svc.db.QueryRow("SELECT config FROM connections WHERE id = ?", "pg-plain").Scan(&rawConfig)
	if err != nil {
		t.Fatalf("raw query failed: %v", err)
	}

	if rawConfig != config {
		t.Errorf("config without password was modified: got %s", rawConfig)
	}
}

func TestConnection_ExistingPlaintextPassesThrough(t *testing.T) {
	svc := newTestService(t)

	// Insert a connection with plaintext config directly (simulating a pre-encryption DB).
	_, err := svc.db.Exec(`
		INSERT INTO connections (id, name, type, config) VALUES (?, ?, ?, ?)
	`, "legacy", "Legacy", "postgres", `{"host":"localhost","port":5432,"database":"testdb","password":"old-plain-pw"}`)
	if err != nil {
		t.Fatalf("direct insert failed: %v", err)
	}

	// LoadConnections should return it as-is since it's not encrypted.
	loaded, err := svc.LoadConnections()
	if err != nil {
		t.Fatalf("LoadConnections failed: %v", err)
	}

	if !strings.Contains(loaded, "old-plain-pw") {
		t.Error("LoadConnections should return legacy plaintext passwords as-is")
	}
}

// ── 10. KV encryption for sensitive keys ──────────────────────────────────

func TestKV_SensitiveKeyEncrypted(t *testing.T) {
	svc := newTestService(t)

	// Set a sensitive key.
	if err := svc.setKV("kv_store", "api_token", "super-secret-token-123"); err != nil {
		t.Fatalf("setKV failed: %v", err)
	}

	// Verify the value is encrypted in the database.
	var rawValue string
	err := svc.db.QueryRow("SELECT value FROM kv_store WHERE key = ?", "api_token").Scan(&rawValue)
	if err != nil {
		t.Fatalf("raw query failed: %v", err)
	}

	if rawValue == "super-secret-token-123" {
		t.Error("sensitive KV value is stored in plaintext — expected encryption")
	}
	if !strings.HasPrefix(rawValue, "enc:v1:") {
		t.Error("encrypted KV value missing enc:v1: prefix")
	}

	// Verify transparent decryption.
	val, err := svc.getKV("kv_store", "api_token")
	if err != nil {
		t.Fatalf("getKV failed: %v", err)
	}
	if val != "super-secret-token-123" {
		t.Errorf("getKV returned %q, want %q", val, "super-secret-token-123")
	}
}

func TestKV_NonsensitiveKeyPlaintext(t *testing.T) {
	svc := newTestService(t)

	// Set a non-sensitive key.
	if err := svc.setKV("appearance", "theme", "dark"); err != nil {
		t.Fatalf("setKV failed: %v", err)
	}

	// Verify the value is NOT encrypted.
	var rawValue string
	err := svc.db.QueryRow("SELECT value FROM appearance WHERE key = ?", "theme").Scan(&rawValue)
	if err != nil {
		t.Fatalf("raw query failed: %v", err)
	}

	if rawValue != "dark" {
		t.Errorf("non-sensitive KV value was encrypted: got %q", rawValue)
	}
}

func TestKV_PasswordKeyEncrypted(t *testing.T) {
	svc := newTestService(t)

	if err := svc.setKV("kv_store", "redis_password", "p@ssw0rd!"); err != nil {
		t.Fatalf("setKV failed: %v", err)
	}

	val, err := svc.getKV("kv_store", "redis_password")
	if err != nil {
		t.Fatalf("getKV failed: %v", err)
	}
	if val != "p@ssw0rd!" {
		t.Errorf("getKV returned %q, want %q", val, "p@ssw0rd!")
	}
}

func TestKV_CredentialKeyEncrypted(t *testing.T) {
	svc := newTestService(t)

	if err := svc.setKV("kv_store", "aws_credential", "AKIAIOSFODNN7EXAMPLE"); err != nil {
		t.Fatalf("setKV failed: %v", err)
	}

	val, err := svc.getKV("kv_store", "aws_credential")
	if err != nil {
		t.Fatalf("getKV failed: %v", err)
	}
	if val != "AKIAIOSFODNN7EXAMPLE" {
		t.Errorf("getKV returned %q, want %q", val, "AKIAIOSFODNN7EXAMPLE")
	}
}

func TestKV_LoadAllDecryptsSensitive(t *testing.T) {
	svc := newTestService(t)

	svc.setKV("kv_store", "theme", "dark")           // not sensitive
	svc.setKV("kv_store", "api_secret", "my-secret") // sensitive

	all, err := svc.loadAllKV("kv_store")
	if err != nil {
		t.Fatalf("loadAllKV failed: %v", err)
	}

	if all["theme"] != "dark" {
		t.Errorf("theme = %q, want %q", all["theme"], "dark")
	}
	if all["api_secret"] != "my-secret" {
		t.Errorf("api_secret = %q, want %q", all["api_secret"], "my-secret")
	}
}
