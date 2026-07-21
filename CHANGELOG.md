# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [1.0.0] - 2026-07-20

### Added

- **Multi-database support** for six database engines:
  - MySQL
  - PostgreSQL
  - MongoDB
  - SQLite
  - Redis
  - Elasticsearch
- **SSH tunnel support** for secure remote database connections with
  password and key-based authentication.
- **SQL query editor** powered by CodeMirror with syntax highlighting,
  autocompletion, and query history.
- **Schema explorer** with tree-view navigation of databases, tables,
  and columns.
- **Inline data editing** -- insert, update, and delete rows directly
  from the results grid.
- **Dockable panel layout** using rc-dock with save/restore of user
  workspace arrangements.
- **Theme engine** with built-in light and dark themes, custom color
  overrides, and font configuration.
- **Keyboard shortcuts** system with customizable bindings.
- **Persistent state store** backed by local SQLite database for
  connections, settings, query history, and layout preferences.
- **Settings management** for application-wide configuration.
- **Extension system** with a host and registry architecture for
  database-specific UI components.
- **Cross-platform builds** for macOS (.dmg), Windows (.exe), and
  Linux (.deb, .AppImage).
- **Wails v3 framework** integration with Go backend and React frontend.
- **Playwright E2E testing** framework with comprehensive test specs.
- **Vitest** unit testing setup with coverage reporting.

[Unreleased]: https://github.com/DBSutra/DBSutra/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/DBSutra/DBSutra/releases/tag/v1.0.0
