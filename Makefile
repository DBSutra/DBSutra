.PHONY: dev build test lint clean help

# ── Development ─────────────────────────────────────────────────
dev: ## Run development server with hot reload
	cd frontend && npm install
	wails3 generate bindings
	wails3 dev

# ── Build ───────────────────────────────────────────────────────
build: ## Build for current platform
	cd frontend && npm ci --legacy-peer-deps && npm run build
	wails3 generate bindings
	go build -tags production -ldflags="-w -s" -o bin/DBSutra

build-all: ## Build for all platforms (uses GoReleaser)
	goreleaser build --snapshot --clean

# ── Test ────────────────────────────────────────────────────────
test: test-go test-frontend ## Run all tests

test-go: ## Run Go unit tests
	go test ./backend/... -v -count=1 -race

test-go-coverage: ## Run Go tests with coverage
	go test ./backend/... -v -count=1 -race -coverprofile=coverage.out -covermode=atomic
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test-go-integration: ## Run Go integration tests (requires Docker services)
	docker compose -f docker-compose.test.yml up -d
	@sleep 10
	go test -tags integration ./backend/... -v -count=1 -timeout=120s || true
	docker compose -f docker-compose.test.yml down

test-frontend: ## Run frontend unit tests
	cd frontend && npm run test

test-frontend-coverage: ## Run frontend tests with coverage
	cd frontend && npm run test:coverage

test-e2e: ## Run E2E tests
	cd e2e && npx playwright test

# ── Lint ────────────────────────────────────────────────────────
lint: lint-go lint-frontend ## Run all linters

lint-go: ## Run Go linter
	golangci-lint run ./...

lint-frontend: ## Run frontend linter
	cd frontend && npm run lint

format: ## Format all code
	cd frontend && npm run format
	gofmt -w .

format-check: ## Check formatting
	cd frontend && npm run format:check
	@test -z "$$(gofmt -l .)" || (echo "Go files need formatting:" && gofmt -l . && exit 1)

typecheck: ## Run TypeScript type checking
	cd frontend && npm run typecheck

# ── Security ────────────────────────────────────────────────────
security: security-go security-frontend ## Run all security checks

security-go: ## Run Go vulnerability check
	govulncheck ./...

security-frontend: ## Run frontend npm audit
	cd frontend && npm audit --audit-level=moderate

# ── All checks ──────────────────────────────────────────────────
check: lint typecheck test security ## Run all checks (lint, typecheck, test, security)

# ── Clean ───────────────────────────────────────────────────────
clean: ## Clean build artifacts
	rm -rf bin/ dist/ frontend/dist/ frontend/coverage/ coverage.out coverage.html
	rm -rf frontend/node_modules/.vite
	@echo "Clean complete"

# ── Generate ────────────────────────────────────────────────────
generate: ## Generate Wails bindings and icons
	wails3 generate bindings
	wails3 generate icons -input build/appicon.png

# ── Help ────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
