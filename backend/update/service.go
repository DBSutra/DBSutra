// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package update

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"

	clog "clientdb/backend/log"
)

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE SERVICE — checks GitHub Releases for new versions
// ══════════════════════════════════════════════════════════════════════════════

var log = clog.New("update")

// buildVersion is set at compile time via ldflags:
//
//	-ldflags "-X clientdb/backend/update.buildVersion=v1.2.3"
var buildVersion = "dev"

const (
	githubAPIBase   = "https://api.github.com"
	httpTimeout     = 15 * time.Second
	downloadTimeout = 5 * time.Minute
	userAgent       = "DBSutra-Updater/1.0"
)

// Service manages checking for and downloading application updates.
type Service struct {
	// GitHubOwner is the repository owner (e.g. "DBSutra")
	GitHubOwner string
	// GitHubRepo is the repository name (e.g. "DBSutra")
	GitHubRepo string
	// APIBase is the base URL for the GitHub API (defaults to githubAPIBase if empty)
	APIBase string
	// HTTPClient is the HTTP client used for API calls (can be overridden for tests)
	HTTPClient *http.Client
}

// UpdateInfo contains information about an available update.
type UpdateInfo struct {
	Version      string `json:"version"`
	ReleaseNotes string `json:"releaseNotes"`
	DownloadURL  string `json:"downloadURL"`
	Checksum     string `json:"checksum"`
	PublishedAt  string `json:"publishedAt"`
}

// Release represents a GitHub release with its assets.
type Release struct {
	TagName     string  `json:"tag_name"`
	Name        string  `json:"name"`
	Body        string  `json:"body"`
	PublishedAt string  `json:"published_at"`
	Assets      []Asset `json:"assets"`
	HTMLURL     string  `json:"html_url"`
	Prerelease  bool    `json:"prerelease"`
}

// Asset represents a downloadable file attached to a release.
type Asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
	ContentType        string `json:"content_type"`
}

// NewService creates a new update service configured for the DBSutra/DBSutra repo.
func NewService() *Service {
	log.Info("Update service created — repo: %s/%s", "DBSutra", "DBSutra")
	return &Service{
		GitHubOwner: "DBSutra",
		GitHubRepo:  "DBSutra",
		HTTPClient:  &http.Client{Timeout: httpTimeout},
	}
}

// GetCurrentVersion returns the build version set via ldflags, or "dev" if not set.
func (s *Service) GetCurrentVersion() string {
	return buildVersion
}

// apiBase returns the configured API base URL, falling back to the default.
func (s *Service) apiBase() string {
	if s.APIBase != "" {
		return s.APIBase
	}
	return githubAPIBase
}

// GetLatestRelease fetches the latest release from the GitHub Releases API.
// It returns the first non-prerelease, or the newest prerelease if no stable
// release exists.
func (s *Service) GetLatestRelease() (*Release, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/releases", s.apiBase(), s.GitHubOwner, s.GitHubRepo)
	log.Debug("Fetching releases from %s", url)

	ctx, cancel := context.WithTimeout(context.Background(), httpTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", userAgent)

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch releases: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, fmt.Errorf("GitHub API returned %d: %s", resp.StatusCode, string(body))
	}

	var releases []Release
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, fmt.Errorf("decode releases: %w", err)
	}

	if len(releases) == 0 {
		return nil, fmt.Errorf("no releases found for %s/%s", s.GitHubOwner, s.GitHubRepo)
	}

	// Prefer the first non-prerelease; fall back to the newest release
	for i := range releases {
		if !releases[i].Prerelease {
			log.Info("Latest stable release: %s", releases[i].TagName)
			return &releases[i], nil
		}
	}

	log.Info("No stable release found — using latest prerelease: %s", releases[0].TagName)
	return &releases[0], nil
}

// CheckForUpdates compares the current version against the latest GitHub release.
// Returns nil UpdateInfo if already up to date.
func (s *Service) CheckForUpdates(currentVersion string) (*UpdateInfo, error) {
	log.Info("Checking for updates — current: %s", currentVersion)

	release, err := s.GetLatestRelease()
	if err != nil {
		return nil, fmt.Errorf("get latest release: %w", err)
	}

	if !IsNewer(currentVersion, release.TagName) {
		log.Info("Already up to date (%s >= %s)", currentVersion, release.TagName)
		return nil, nil
	}

	log.Info("Update available: %s -> %s", currentVersion, release.TagName)

	info := &UpdateInfo{
		Version:      release.TagName,
		ReleaseNotes: release.Body,
		PublishedAt:  release.PublishedAt,
	}

	// Find a suitable download asset for the current platform
	asset := pickAsset(release.Assets)
	if asset != nil {
		info.DownloadURL = asset.BrowserDownloadURL
		log.Info("Selected asset: %s (%d bytes)", asset.Name, asset.Size)
	} else {
		log.Warn("No suitable download asset found — falling back to release page")
		info.DownloadURL = release.HTMLURL
	}

	return info, nil
}

// DownloadUpdate downloads the update from assetURL to destPath.
func (s *Service) DownloadUpdate(assetURL, destPath string) error {
	return s.DownloadUpdateWithProgress(assetURL, destPath, nil)
}

// DownloadUpdateWithProgress downloads the update and calls onProgress periodically.
// The callback receives bytes downloaded and total bytes (-1 if unknown).
func (s *Service) DownloadUpdateWithProgress(assetURL, destPath string, onProgress func(downloaded, total int64)) error {
	if assetURL == "" {
		return fmt.Errorf("empty download URL")
	}

	log.Info("Downloading update: %s -> %s", assetURL, destPath)

	ctx, cancel := context.WithTimeout(context.Background(), downloadTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, assetURL, nil)
	if err != nil {
		return fmt.Errorf("create download request: %w", err)
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download returned HTTP %d", resp.StatusCode)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("create file %s: %w", destPath, err)
	}
	defer func() {
		if cerr := out.Close(); cerr != nil {
			log.Warn("Failed to close output file: %v", cerr)
		}
	}()

	totalBytes := resp.ContentLength
	var downloaded int64
	buf := make([]byte, 32*1024)

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := out.Write(buf[:n]); writeErr != nil {
				return fmt.Errorf("write to %s: %w", destPath, writeErr)
			}
			downloaded += int64(n)
			if onProgress != nil {
				onProgress(downloaded, totalBytes)
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			return fmt.Errorf("read body: %w", readErr)
		}
	}

	log.Info("Download complete: %d bytes written to %s", downloaded, destPath)
	return nil
}

// VerifyChecksum verifies that the file at filePath matches the expected SHA-256 hash.
func (s *Service) VerifyChecksum(filePath, expectedSHA256 string) error {
	if expectedSHA256 == "" {
		return fmt.Errorf("empty expected checksum")
	}

	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open file for verification: %w", err)
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return fmt.Errorf("hash file: %w", err)
	}

	actual := hex.EncodeToString(h.Sum(nil))
	if actual != expectedSHA256 {
		return fmt.Errorf("checksum mismatch: got %s, want %s", actual, expectedSHA256)
	}

	log.Info("Checksum verified: %s", actual[:16]+"...")
	return nil
}

// pickAsset selects the best asset for the current OS/arch from the release assets.
// Returns nil if no suitable asset is found.
func pickAsset(assets []Asset) *Asset {
	if len(assets) == 0 {
		return nil
	}

	goos := runtime.GOOS
	goarch := runtime.GOARCH

	// First pass: exact OS + arch match
	for i := range assets {
		if matchesPlatform(assets[i].Name, goos, goarch) {
			return &assets[i]
		}
	}

	// Second pass: OS match only (accept any arch)
	for i := range assets {
		if matchesOS(assets[i].Name, goos) {
			return &assets[i]
		}
	}

	// Third pass: universal / cross-platform binary
	for i := range assets {
		if isUniversalAsset(assets[i].Name) {
			return &assets[i]
		}
	}

	// Fall back to the first asset
	return &assets[0]
}

// matchesPlatform checks if an asset filename matches the given OS and architecture.
func matchesPlatform(name, goos, goarch string) bool {
	return matchesOS(name, goos) && matchesArch(name, goarch)
}

// matchesOS checks if an asset filename matches the given OS.
func matchesOS(name, goos string) bool {
	lower := strings.ToLower(name)
	switch goos {
	case "darwin":
		return strings.Contains(lower, "darwin") ||
			strings.Contains(lower, "macos") ||
			strings.Contains(lower, "osx")
	case "linux":
		return strings.Contains(lower, "linux")
	case "windows":
		return strings.Contains(lower, "windows") ||
			strings.Contains(lower, "win")
	default:
		return false
	}
}

// matchesArch checks if an asset filename matches the given architecture.
func matchesArch(name, goarch string) bool {
	lower := strings.ToLower(name)
	switch goarch {
	case "amd64":
		return strings.Contains(lower, "amd64") ||
			strings.Contains(lower, "x86_64") ||
			strings.Contains(lower, "x64")
	case "arm64":
		return strings.Contains(lower, "arm64") ||
			strings.Contains(lower, "aarch64")
	default:
		return true // unknown arch — accept any
	}
}

// isUniversalAsset checks if an asset is platform-independent.
func isUniversalAsset(name string) bool {
	lower := strings.ToLower(name)
	return strings.Contains(lower, "universal") ||
		strings.Contains(lower, "all-platforms")
}
