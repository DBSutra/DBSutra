// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package update

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// Mock helpers
// ══════════════════════════════════════════════════════════════════════════════

func newTestService(handler http.Handler) (*Service, *httptest.Server) {
	ts := httptest.NewServer(handler)
	svc := &Service{
		GitHubOwner: "testowner",
		GitHubRepo:  "testrepo",
		APIBase:     ts.URL,
		HTTPClient:  ts.Client(),
	}
	return svc, ts
}

// ══════════════════════════════════════════════════════════════════════════════
// GetCurrentVersion
// ══════════════════════════════════════════════════════════════════════════════

func TestGetCurrentVersion(t *testing.T) {
	svc := NewService()
	// Default buildVersion is "dev"
	got := svc.GetCurrentVersion()
	if got == "" {
		t.Error("GetCurrentVersion() returned empty string")
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// GetLatestRelease
// ══════════════════════════════════════════════════════════════════════════════

func TestGetLatestRelease_Success(t *testing.T) {
	releases := []Release{
		{
			TagName: "v2.0.0",
			Name:    "Release 2.0.0",
			Body:    "New features",
			Assets: []Asset{
				{Name: "clientdb-darwin-amd64", BrowserDownloadURL: "https://example.com/darwin"},
			},
		},
		{
			TagName: "v1.0.0",
			Name:    "Release 1.0.0",
		},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/testowner/testrepo/releases" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(releases)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	release, err := svc.GetLatestRelease()
	if err != nil {
		t.Fatalf("GetLatestRelease() error: %v", err)
	}

	if release.TagName != "v2.0.0" {
		t.Errorf("GetLatestRelease() TagName = %q, want %q", release.TagName, "v2.0.0")
	}
	if release.Body != "New features" {
		t.Errorf("GetLatestRelease() Body = %q, want %q", release.Body, "New features")
	}
}

func TestGetLatestRelease_SkipsPrerelease(t *testing.T) {
	releases := []Release{
		{TagName: "v2.0.0-beta.1", Prerelease: true},
		{TagName: "v1.5.0", Prerelease: false},
		{TagName: "v1.4.0-rc.1", Prerelease: true},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(releases)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	release, err := svc.GetLatestRelease()
	if err != nil {
		t.Fatalf("GetLatestRelease() error: %v", err)
	}

	if release.TagName != "v1.5.0" {
		t.Errorf("GetLatestRelease() TagName = %q, want %q (should skip prerelease)", release.TagName, "v1.5.0")
	}
}

func TestGetLatestRelease_AllPrerelease(t *testing.T) {
	releases := []Release{
		{TagName: "v2.0.0-beta.1", Prerelease: true},
		{TagName: "v1.5.0-rc.1", Prerelease: true},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(releases)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	release, err := svc.GetLatestRelease()
	if err != nil {
		t.Fatalf("GetLatestRelease() error: %v", err)
	}

	// Should return the first prerelease as fallback
	if release.TagName != "v2.0.0-beta.1" {
		t.Errorf("GetLatestRelease() TagName = %q, want %q", release.TagName, "v2.0.0-beta.1")
	}
}

func TestGetLatestRelease_EmptyReleases(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Release{})
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	_, err := svc.GetLatestRelease()
	if err == nil {
		t.Error("GetLatestRelease() expected error for empty releases, got nil")
	}
}

func TestGetLatestRelease_APIError(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprint(w, `{"message":"rate limit exceeded"}`)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	_, err := svc.GetLatestRelease()
	if err == nil {
		t.Error("GetLatestRelease() expected error for 403, got nil")
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// CheckForUpdates
// ══════════════════════════════════════════════════════════════════════════════

func TestCheckForUpdates_UpdateAvailable(t *testing.T) {
	releases := []Release{
		{
			TagName: "v2.0.0",
			Name:    "Release 2.0.0",
			Body:    "## What's New\n- Feature A\n- Bug fix B",
			Assets: []Asset{
				{Name: "clientdb-darwin-amd64.tar.gz", BrowserDownloadURL: "https://example.com/darwin.tar.gz", Size: 1024},
			},
		},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(releases)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	info, err := svc.CheckForUpdates("v1.0.0")
	if err != nil {
		t.Fatalf("CheckForUpdates() error: %v", err)
	}
	if info == nil {
		t.Fatal("CheckForUpdates() returned nil — expected update info")
	}
	if info.Version != "v2.0.0" {
		t.Errorf("UpdateInfo.Version = %q, want %q", info.Version, "v2.0.0")
	}
	if info.ReleaseNotes != "## What's New\n- Feature A\n- Bug fix B" {
		t.Errorf("UpdateInfo.ReleaseNotes = %q", info.ReleaseNotes)
	}
	if info.DownloadURL == "" {
		t.Error("UpdateInfo.DownloadURL is empty")
	}
}

func TestCheckForUpdates_AlreadyUpToDate(t *testing.T) {
	releases := []Release{
		{TagName: "v1.0.0", Name: "Release 1.0.0"},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(releases)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	info, err := svc.CheckForUpdates("v1.0.0")
	if err != nil {
		t.Fatalf("CheckForUpdates() error: %v", err)
	}
	if info != nil {
		t.Errorf("CheckForUpdates() = %+v, want nil (already up to date)", info)
	}
}

func TestCheckForUpdates_CurrentNewer(t *testing.T) {
	releases := []Release{
		{TagName: "v1.0.0", Name: "Release 1.0.0"},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(releases)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	info, err := svc.CheckForUpdates("v2.0.0")
	if err != nil {
		t.Fatalf("CheckForUpdates() error: %v", err)
	}
	if info != nil {
		t.Errorf("CheckForUpdates() = %+v, want nil (current is newer)", info)
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// VerifyChecksum
// ══════════════════════════════════════════════════════════════════════════════

func TestVerifyChecksum_Match(t *testing.T) {
	content := []byte("hello world")
	h := sha256.Sum256(content)
	expected := hex.EncodeToString(h[:])

	tmpFile := filepath.Join(t.TempDir(), "testfile.bin")
	if err := os.WriteFile(tmpFile, content, 0644); err != nil {
		t.Fatalf("write temp file: %v", err)
	}

	svc := NewService()
	if err := svc.VerifyChecksum(tmpFile, expected); err != nil {
		t.Errorf("VerifyChecksum() error: %v", err)
	}
}

func TestVerifyChecksum_Mismatch(t *testing.T) {
	content := []byte("hello world")
	tmpFile := filepath.Join(t.TempDir(), "testfile.bin")
	if err := os.WriteFile(tmpFile, content, 0644); err != nil {
		t.Fatalf("write temp file: %v", err)
	}

	svc := NewService()
	err := svc.VerifyChecksum(tmpFile, "0000000000000000000000000000000000000000000000000000000000000000")
	if err == nil {
		t.Error("VerifyChecksum() expected mismatch error, got nil")
	}
}

func TestVerifyChecksum_EmptyExpected(t *testing.T) {
	svc := NewService()
	err := svc.VerifyChecksum("/dev/null", "")
	if err == nil {
		t.Error("VerifyChecksum() expected error for empty checksum, got nil")
	}
}

func TestVerifyChecksum_FileNotFound(t *testing.T) {
	svc := NewService()
	err := svc.VerifyChecksum("/nonexistent/file", "abc123")
	if err == nil {
		t.Error("VerifyChecksum() expected error for missing file, got nil")
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// DownloadUpdate
// ══════════════════════════════════════════════════════════════════════════════

func TestDownloadUpdate_Success(t *testing.T) {
	content := []byte("fake update binary content here")
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(content)))
		w.Write(content)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	destPath := filepath.Join(t.TempDir(), "update.bin")
	err := svc.DownloadUpdate(ts.URL+"/download", destPath)
	if err != nil {
		t.Fatalf("DownloadUpdate() error: %v", err)
	}

	got, err := os.ReadFile(destPath)
	if err != nil {
		t.Fatalf("read downloaded file: %v", err)
	}
	if string(got) != string(content) {
		t.Errorf("DownloadUpdate() wrote %q, want %q", string(got), string(content))
	}
}

func TestDownloadUpdate_EmptyURL(t *testing.T) {
	svc := NewService()
	err := svc.DownloadUpdate("", "/tmp/test.bin")
	if err == nil {
		t.Error("DownloadUpdate() expected error for empty URL, got nil")
	}
}

func TestDownloadUpdate_ServerError(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	err := svc.DownloadUpdate(ts.URL+"/download", filepath.Join(t.TempDir(), "update.bin"))
	if err == nil {
		t.Error("DownloadUpdate() expected error for 500, got nil")
	}
}

func TestDownloadUpdate_Progress(t *testing.T) {
	content := make([]byte, 1024)
	for i := range content {
		content[i] = byte(i % 256)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(content)))
		w.Write(content)
	})

	svc, ts := newTestService(handler)
	defer ts.Close()

	var progressCalls []int64
	onProgress := func(downloaded, total int64) {
		progressCalls = append(progressCalls, downloaded)
	}

	destPath := filepath.Join(t.TempDir(), "update.bin")
	err := svc.DownloadUpdateWithProgress(ts.URL+"/download", destPath, onProgress)
	if err != nil {
		t.Fatalf("DownloadUpdateWithProgress() error: %v", err)
	}

	if len(progressCalls) == 0 {
		t.Error("onProgress was never called")
	}

	// Last progress call should equal total bytes
	if progressCalls[len(progressCalls)-1] != int64(len(content)) {
		t.Errorf("last progress = %d, want %d", progressCalls[len(progressCalls)-1], len(content))
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// pickAsset
// ══════════════════════════════════════════════════════════════════════════════

func TestPickAsset_Empty(t *testing.T) {
	if got := pickAsset(nil); got != nil {
		t.Errorf("pickAsset(nil) = %+v, want nil", got)
	}
	if got := pickAsset([]Asset{}); got != nil {
		t.Errorf("pickAsset([]) = %+v, want nil", got)
	}
}

func TestPickAsset_Fallback(t *testing.T) {
	assets := []Asset{
		{Name: "some-random-file.txt", BrowserDownloadURL: "https://example.com/file.txt"},
	}
	got := pickAsset(assets)
	if got == nil {
		t.Fatal("pickAsset() returned nil for non-empty assets")
	}
	if got.Name != "some-random-file.txt" {
		t.Errorf("pickAsset() Name = %q, want %q", got.Name, "some-random-file.txt")
	}
}
