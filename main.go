// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package main

import (
	"embed"
	"fmt"
	"os"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"

	clog "clientdb/backend/log"
)

//go:embed all:frontend/dist
var assets embed.FS

// Version info — set via ldflags at build time
var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

var log = clog.New("main")

func main() {
	log.Info("═══════════════════════════════════════════════════════════")
	log.Info("DBSutra v%s (commit: %s, built: %s)", version, commit, date)
	log.Info("Go version: %s", runtime.Version())
	log.Info("OS/Arch: %s/%s", runtime.GOOS, runtime.GOARCH)
	log.Info("PID: %d", os.Getpid())
	log.Info("═══════════════════════════════════════════════════════════")

	// Create all services
	log.Info("Initializing backend services...")
	dbSvc, stateSvc, settingsSvc, fsSvc := createServices()
	log.Info("All backend services initialized successfully")

	// Create Wails v3 application
	log.Info("Creating Wails application...")
	app := application.New(application.Options{
		Name:        "DBSutra",
		Description: "A modular, extensible desktop database client",
		Services: []application.Service{
			application.NewService(dbSvc),
			application.NewService(stateSvc),
			application.NewService(settingsSvc),
			application.NewService(fsSvc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})
	log.Info("Wails application created")

	// Create main window
	log.Info("Creating main window (1400x900)...")
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "DBSutra",
		Width:     1400,
		Height:    900,
		MinWidth:  900,
		MinHeight: 600,
		BackgroundColour: application.RGBA{
			Red: 30, Green: 30, Blue: 30, Alpha: 255,
		},
	})

	// Run the application
	log.Info("Starting application event loop...")
	// Handle --version flag
	if len(os.Args) > 1 && (os.Args[1] == "--version" || os.Args[1] == "-v") {
		fmt.Printf("DBSutra v%s (commit: %s, built: %s)\n", version, commit, date)
		os.Exit(0)
	}

	if err := app.Run(); err != nil {
		errMsg := fmt.Sprintf("Application run failed: %v", err)
		log.Error(errMsg)
		fmt.Fprintf(os.Stderr, "FATAL: %s\n", errMsg)
		os.Exit(1)
	}
	log.Info("Application exited normally")
}
