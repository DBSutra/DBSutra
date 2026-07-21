// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package fs

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	clog "clientdb/backend/log"
)

var log = clog.New("fs")

// Service handles filesystem operations for the app
type Service struct {
	ctx    context.Context
	appDir string
}

// NewService creates a new FS service
func NewService() *Service {
	home, err := os.UserHomeDir()
	if err != nil {
		log.Error("Failed to get home dir: %v — using current dir", err)
		home = "."
	}
	appDir := filepath.Join(home, ".dbsutra")
	log.Info("App data directory: %s", appDir)

	if err := os.MkdirAll(appDir, 0755); err != nil {
		log.Error("Failed to create app dir %s: %v", appDir, err)
	} else {
		log.Debug("App directory ensured: %s", appDir)
	}
	return &Service{appDir: appDir}
}

// NewServiceWithDir creates a new FS service rooted at the given directory.
// This is useful for testing or when a custom data directory is needed.
func NewServiceWithDir(dir string) *Service {
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Error("Failed to create dir %s: %v", dir, err)
	}
	return &Service{appDir: dir}
}

func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// ReadFile reads a file relative to appDir
func (s *Service) ReadFile(name string) (string, error) {
	path := filepath.Join(s.appDir, name)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			log.Debug("File not found: %s", path)
		} else {
			log.Error("ReadFile failed for %s: %v", path, err)
		}
		return "", err
	}
	log.Debug("ReadFile OK: %s (%d bytes)", name, len(data))
	return string(data), nil
}

// WriteFile writes content to a file relative to appDir
func (s *Service) WriteFile(name string, content string) error {
	path := filepath.Join(s.appDir, name)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		log.Error("WriteFile: failed to create dir for %s: %v", path, err)
		return fmt.Errorf("create dir: %w", err)
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		log.Error("WriteFile failed for %s: %v", path, err)
		return err
	}
	log.Debug("WriteFile OK: %s (%d bytes)", name, len(content))
	return nil
}

// FileExists checks if a file exists
func (s *Service) FileExists(name string) bool {
	path := filepath.Join(s.appDir, name)
	_, err := os.Stat(path)
	exists := !os.IsNotExist(err)
	log.Debug("FileExists(%s) = %v", name, exists)
	return exists
}

// GetAppDir returns the application data directory
func (s *Service) GetAppDir() string {
	return s.appDir
}

// ListFiles lists files in a subdirectory
func (s *Service) ListFiles(subdir string) ([]string, error) {
	dir := filepath.Join(s.appDir, subdir)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			log.Debug("ListFiles: directory not found: %s", subdir)
			return []string{}, nil
		}
		log.Error("ListFiles failed for %s: %v", subdir, err)
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() {
			names = append(names, e.Name())
		}
	}
	log.Debug("ListFiles(%s): %d files", subdir, len(names))
	return names, nil
}

// DeleteFile removes a file
func (s *Service) DeleteFile(name string) error {
	path := filepath.Join(s.appDir, name)
	err := os.Remove(path)
	if err != nil {
		log.Error("DeleteFile failed for %s: %v", path, err)
	} else {
		log.Info("Deleted file: %s", name)
	}
	return err
}
