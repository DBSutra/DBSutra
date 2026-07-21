# DBSutra Architecture

This document describes the high-level architecture of DBSutra, a modular
desktop database client built with Go and Wails v3.

## System Overview

DBSutra is a desktop application built on the
[Wails v3](https://wails.io/) framework, which combines a Go backend with a
React (TypeScript) frontend rendered in a native webview. The Go backend
handles all database interactions, SSH tunneling, persistent state, and
filesystem operations. The React frontend provides the UI for query editing,
schema browsing, data editing, and workspace management.

Communication between the frontend and backend is handled through Wails
service bindings -- Go structs are exposed as services, and the frontend
calls their methods via auto-generated TypeScript bindings.

## Architecture Diagram

```
+------------------------------------------------------------------+
|                        Desktop Window (OS)                        |
|  +------------------------------------------------------------+  |
|  |                   React Frontend (TypeScript)                |  |
|  |                                                             |  |
|  |  +------------+  +------------+  +-----------+  +--------+ |  |
|  |  |  Query     |  |  Schema    |  |  Data     |  | Conn.  | |  |
|  |  |  Editor    |  |  Explorer  |  |  Grid     |  | Panel  | |  |
|  |  | (CodeMirror|  |  (Tree)    |  | (Virtuoso)|  |        | |  |
|  |  +------------+  +------------+  +-----------+  +--------+ |  |
|  |                                                             |  |
|  |  +------------+  +------------+  +-----------+             |  |
|  |  |  Theme     |  |  Layout    |  | Extension |             |  |
|  |  |  Engine    |  |  (rc-dock) |  |  Host     |             |  |
|  |  +------------+  +------------+  +-----------+             |  |
|  |                                                             |  |
|  |  +------------------------------------------------------+  |  |
|  |  |              Zustand State Store                      |  |  |
|  |  |  connections | theme | layout | queries | shortcuts   |  |  |
|  |  +------------------------------------------------------+  |  |
|  +------------------------------------------------------------+  |
|                          |  Wails Bindings  |                    |
|  +------------------------------------------------------------+  |
|  |                    Go Backend (Wails v3)                    |  |
|  |                                                             |  |
|  |  +-------------------+       +-------------------------+   |  |
|  |  |   DB Service      |       |   State Service         |   |  |
|  |  |                   |       |   (SQLite: state.db)    |   |  |
|  |  |  +-------------+  |       |                         |   |  |
|  |  |  | MySQL       |  |       |  connections            |   |  |
|  |  |  | PostgreSQL  |  |       |  themes                 |   |  |
|  |  |  | MongoDB     |  |       |  shortcuts              |   |  |
|  |  |  | SQLite      |  |       |  query_history          |   |  |
|  |  |  | Redis       |  |       |  dock_layout            |   |  |
|  |  |  | Elastic     |  |       |  color_overrides        |   |  |
|  |  |  +-------------+  |       |  panel_config           |   |  |
|  |  |                   |       |  fonts                  |   |  |
|  |  |  +-------------+  |       +-------------------------+   |  |
|  |  |  | SSH Tunnel  |  |                                     |  |
|  |  |  +-------------+  |       +-------------------------+   |  |
|  |  +-------------------+       |   Settings Service      |   |  |
|  |                              |   (JSON config files)   |   |  |
|  |                              +-------------------------+   |  |
|  |                                                             |  |
|  |  +-------------------+       +-------------------------+   |  |
|  |  |   FS Service      |       |   Logger (clog)         |   |  |
|  |  |   (file I/O)      |       +-------------------------+   |  |
|  |  +-------------------+                                     |  |
|  +------------------------------------------------------------+  |
|                          |           |                           |
|               +----------+           +----------+               |
|               | Remote DBs|          | Local DB  |               |
|               | (network) |          | (SQLite)  |               |
|               +-----------+          +-----------+               |
+------------------------------------------------------------------+
```

## Data Flow

### Query Execution

```
User types SQL in CodeMirror editor
        |
        v
Frontend calls DBService.Query(connID, sql)
        |
        v (Wails binding -- JSON over IPC)
Go DB Service looks up connection by ID
        |
        v
Driver.Query(sql) executes against the target database
        |
        v
QueryResult { columns, rows, rowsAffected, error } returned
        |
        v (Wails binding)
Frontend receives result, renders in data grid
```

### Connection Lifecycle

```
User configures connection in ConnectionPanel
        |
        v
Frontend calls DBService.Connect(config)
        |
        v
Go DB Service:
  1. If SSH config present, create SSH tunnel (get local port)
  2. Instantiate driver via registered factory
  3. Call driver.Connect(config) through tunnel if needed
  4. Store activeConn { driver, config, listener }
  5. Return connection ID
        |
        v
Frontend stores connID in Zustand, opens query editor panel
```

### State Persistence

```
User changes a setting / saves a connection / arranges layout
        |
        v
Frontend calls StateService.<method>(...)
        |
        v
Go State Service writes to SQLite database (~/.dbsutra/state.db)
        |
        v
On next app launch, StateService reads from SQLite to restore state
        |
        v
Frontend calls StateService to hydrate Zustand stores on init
```

## Module Descriptions (Backend)

### `backend/db/` -- Database Layer

The database layer implements a driver-based architecture with a common
`Driver` interface. Each supported database engine has its own sub-package
that implements this interface.

**Key types:**
- `Driver` interface: `Connect`, `Query`, `GetSchema`, `Disconnect`, `Ping`,
  `InsertRow`, `UpdateRow`, `DeleteRow`
- `ConnectionConfig`: connection parameters including optional SSH config
- `QueryResult`: columns, rows, rowsAffected, error
- `SchemaDatabase` / `SchemaTable` / `SchemaColumn`: schema metadata

**Service (`service.go`):** Manages active connections. Provides thread-safe
connection pooling with `sync.RWMutex`. Handles SSH tunnel creation and
teardown as part of the connection lifecycle.

**Drivers:**

| Package         | Database       | Go Driver Library                 |
|-----------------|----------------|-----------------------------------|
| `mysql/`        | MySQL          | `go-sql-driver/mysql`             |
| `postgres/`     | PostgreSQL     | `lib/pq`                          |
| `mongodb/`      | MongoDB        | `go.mongodb.org/mongo-driver`     |
| `sqlite/`       | SQLite         | `modernc.org/sqlite` (pure Go)    |
| `redis/`        | Redis          | `redis/go-redis/v9`               |
| `elasticsearch/`| Elasticsearch  | `elastic/go-elasticsearch/v8`     |

**SSH Tunnel (`ssh_tunnel.go`):** Creates a local TCP listener that forwards
traffic through an SSH connection to the remote database host. Supports
password and key-based authentication.

**Query Helpers (`query_helpers.go`):** Shared utility functions for query
parsing, result formatting, and SQL dialect handling.

### `backend/state/` -- State Management

The state service provides persistent storage for all user data using a local
SQLite database at `~/.dbsutra/state.db`.

**Modules:**

| File                   | Responsibility                              |
|------------------------|---------------------------------------------|
| `connections.go`       | Saved database connection configurations    |
| `themes.go`            | Custom theme definitions                    |
| `color_overrides.go`   | Per-user color customizations               |
| `shortcuts.go`         | Keyboard shortcut bindings                  |
| `query_history.go`     | History of executed queries                 |
| `dock_layout.go`       | Saved panel/workspace layouts               |
| `panel_config.go`      | Per-panel configuration                     |
| `config_loader.go`     | Configuration loading and migration         |
| `appearance.go`        | Font and appearance preferences             |
| `fonts.go`             | Font configuration                          |
| `kv_helpers.go`        | Generic key-value storage helpers           |
| `legacy_kv.go`         | Migration from legacy storage format        |

### `backend/settings/` -- Settings Service

Manages application-level settings stored as JSON configuration files on the
filesystem. Separate from the SQLite-backed state store -- settings are
human-readable JSON files.

### `backend/fs/` -- Filesystem Service

Provides safe file I/O operations with an application-scoped base directory.
Used by the settings service and for import/export operations.

### `backend/log/` -- Logger

A structured logging package (`clog`) used throughout the backend. Supports
log levels (Debug, Info, Warn, Error) and scoped loggers per module.

## Frontend Architecture

### Technology Stack

| Library            | Purpose                              |
|--------------------|--------------------------------------|
| React 19           | UI framework                         |
| TypeScript 7       | Type-safe JavaScript                 |
| Zustand 5          | Lightweight state management         |
| CodeMirror 6       | SQL query editor with syntax support |
| rc-dock            | Dockable panel layout system         |
| React Virtuoso     | Virtualized list rendering           |
| Allotment          | Resizable split panes                |
| Lucide React       | Icon library                         |
| @xyflow/react      | Schema relationship diagrams         |
| Radix UI           | Accessible UI primitives (context menus) |

### Directory Structure

```
frontend/src/
  app/              -- App root and bootstrap
  core/             -- Core infrastructure
    commands/       -- Command registry (command palette)
    connections/    -- Connection manager
    container/      -- Dependency container
    database/       -- Database abstraction layer
    events/         -- Event bus (pub/sub)
    extensions/     -- Extension system core
    modal/          -- Modal dialog system
    panels/         -- Panel registry and types
    settings/       -- Settings bridge (Go <-> TS)
    state/          -- Zustand store
    theme/          -- Theme engine
  features/         -- Feature modules
    editor/         -- Code editor features
    extensions/     -- Extension implementations
    panels/         -- Panel implementations
  layout/           -- Application layout components
  shared/           -- Shared hooks and utilities
  styles/           -- Global styles
  components/       -- Reusable UI components
  config/           -- App configuration
  types/            -- TypeScript type definitions
```

### State Management (Zustand)

The application uses Zustand for frontend state management. The central store
(`core/state/store.ts`) manages:

- Active database connections and their status
- Current theme and color overrides
- Dock layout configuration
- Query editor state
- Keyboard shortcuts

State is hydrated from the Go backend (via the State service) on application
startup, and mutations are synced back to the backend for persistence.

### Event Bus

A pub/sub event bus (`core/events/`) decouples components. Events are used
for:

- Connection state changes
- Theme updates
- Query completion notifications
- Panel lifecycle events

### Panel System

Panels are the primary UI building blocks. Each panel type is registered in
the `PanelRegistry` with:

- A unique type identifier
- A React component
- Default configuration

The `rc-dock` layout manager handles panel arrangement, docking, tabbing, and
floating. Layouts are persisted to the state store.

## Extension System

DBSutra includes an extension system that allows database-specific UI
components to be registered and rendered contextually.

### Architecture

```
frontend/src/core/extensions/
  ExtensionHost.ts        -- Manages extension lifecycle
  ExtensionContext.ts     -- Provides context to extensions

frontend/src/features/extensions/
  registry/               -- Built-in extension implementations
    mysql/                -- MySQL-specific UI components
      components/
        query/            -- Query execution hooks
        schema/           -- Schema explorer component
```

### How It Works

1. Extensions are registered in the `ExtensionHost` at application startup.
2. Each extension declares which database type(s) it supports.
3. When a panel is opened for a specific connection, the extension host
   resolves the appropriate extension and provides it via `ExtensionContext`.
4. Extensions can customize the query editor, schema explorer, and data grid
   with database-specific behavior (e.g., MySQL-specific query formatting,
   schema metadata rendering).

## Build and Distribution

The build system uses Wails v3 with platform-specific Taskfiles:

```
build/
  Taskfile.yml              -- Common build tasks
  config.yml                -- Wails build configuration
  darwin/Taskfile.yml       -- macOS build (creates .app bundle, .dmg)
  windows/Taskfile.yml      -- Windows build
  linux/Taskfile.yml        -- Linux build (.deb, .AppImage)
  ios/Taskfile.yml          -- iOS build (experimental)
```

The Go binary embeds the compiled frontend assets (`frontend/dist`) using
Go's `embed` package, producing a single self-contained executable.
