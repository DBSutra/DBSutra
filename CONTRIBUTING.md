# Contributing to DBSutra

Thank you for your interest in contributing to DBSutra. This document outlines
the guidelines and procedures for contributing to this project.

## Table of Contents

- [Development Setup](#development-setup)
- [Running the Dev Server](#running-the-dev-server)
- [Code Style](#code-style)
- [Testing](#testing)
- [Branch Strategy](#branch-strategy)
- [Pull Request Process](#pull-request-process)
- [Commit Conventions](#commit-conventions)

## Development Setup

### Prerequisites

| Tool      | Minimum Version | Notes                              |
|-----------|-----------------|------------------------------------|
| Go        | 1.26+           | Backend language                   |
| Node.js   | 24+             | Frontend build tooling             |
| npm       | 10+             | Package manager (ships with Node)  |
| Wails v3  | alpha.117+      | Desktop application framework      |

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd DBSutra
   ```

2. **Install Go dependencies:**
   ```bash
   go mod download
   ```

3. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Install Wails v3 CLI** (if not already installed):
   ```bash
   go install github.com/wailsapp/wails/v3/cmd/wails3@latest
   ```

5. **Verify the setup:**
   ```bash
   wails3 doctor
   ```

## Running the Dev Server

Start the development server with hot-reload for both Go backend and React
frontend:

```bash
wails3 dev
```

This starts:
- The Vite dev server (default: `http://localhost:5173`)
- The Go backend with automatic recompilation on source changes

Alternatively, using the Taskfile:

```bash
wails3 task dev
```

### Useful Development Commands

```bash
# Generate Go-to-frontend bindings
wails3 generate bindings

# Run Go backend tests
go test ./backend/...

# Run frontend tests
cd frontend && npm test

# Lint frontend code
cd frontend && npm run lint

# Type-check frontend
cd frontend && npm run typecheck
```

## Code Style

### Go

- **Formatter:** All Go code must be formatted with `gofmt`. No exceptions.
- **Linter:** The project uses `golangci-lint` with the configuration in
  `.golangci.yml`. Run `golangci-lint run` before submitting.
- **Naming:** Follow standard Go conventions -- exported names are PascalCase,
  unexported are camelCase.
- **Error handling:** Return errors explicitly. Do not panic in library code.
- **Logging:** Use the project's `backend/log` package (`clog`), not `fmt.Println`.

### TypeScript / React

- **Formatter:** Prettier (config in `.prettierrc`). Run `npm run format` to
  auto-format.
- **Linter:** ESLint (config in `.eslintrc.cjs`). Run `npm run lint` to check.
- **Type safety:** Strict TypeScript. All files must pass `tsc --noEmit`.
- **Naming:**
  - Files: `kebab-case.tsx` for components, `camelCase.ts` for utilities.
  - Components: PascalCase (e.g., `SchemaExplorer`).
  - Hooks: prefixed with `use` (e.g., `useQueryExecution`).
- **State management:** Use Zustand stores. Avoid prop drilling beyond two
  levels.

## Testing

### Go Tests

```bash
# Run all backend tests
go test ./backend/...

# Run tests with verbose output
go test -v ./backend/...

# Run a specific package
go test ./backend/db/...
```

### Frontend Unit Tests (Vitest)

```bash
cd frontend

# Run all tests once
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### End-to-End Tests (Playwright)

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npx playwright test
```

## Branch Strategy

- **`main`** -- Production-ready code. All releases are tagged from this branch.
- **Feature branches** -- Create from `main` for new work:
  ```
  feature/<short-description>
  ```
  Example: `feature/redis-cluster-support`

- **Bug fix branches:**
  ```
  fix/<short-description>
  ```
  Example: `fix/mysql-connection-timeout`

- **Keep branches short-lived.** Merge back to `main` frequently to avoid
  long-lived branch drift.

## Pull Request Process

1. **Create a branch** from `main` following the naming convention above.
2. **Make your changes.** Keep commits focused and atomic.
3. **Ensure all checks pass:**
   ```bash
   go test ./backend/...
   cd frontend && npm test
   cd frontend && npm run lint
   cd frontend && npm run typecheck
   ```
4. **Push your branch** and open a pull request against `main`.
5. **Fill out the PR template** completely, including a description of what
   changed and why.
6. **Wait for review.** Address any feedback from maintainers.
7. **Squash merge** is the default merge strategy. Your PR title becomes the
   commit message, so follow the commit conventions below.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Every commit message (and PR title) must follow this format:

```
<type>(<scope>): <description>
```

### Types

| Type       | When to use                                   |
|------------|-----------------------------------------------|
| `feat`     | A new feature                                 |
| `fix`      | A bug fix                                     |
| `docs`     | Documentation only changes                    |
| `style`    | Code style changes (formatting, no logic)     |
| `refactor` | Code restructuring without behavior change    |
| `test`     | Adding or updating tests                      |
| `chore`    | Build process, tooling, dependencies          |
| `perf`     | Performance improvements                      |
| `ci`       | CI/CD pipeline changes                        |

### Scopes

Common scopes for this project:

- `db` -- Database drivers and query engine
- `ui` -- Frontend components and layout
- `state` -- State management (Zustand, SQLite state store)
- `settings` -- Application settings
- `theme` -- Theming and appearance
- `ext` -- Extension system
- `ssh` -- SSH tunnel functionality

### Examples

```
feat(db): add PostgreSQL SSL certificate authentication
fix(ssh): close tunnel listener on connection failure
docs: add architecture diagram to README
refactor(state): extract query history into dedicated module
test(db): add unit tests for MySQL driver
chore(deps): update Wails to v3.0.0-alpha.117
```
