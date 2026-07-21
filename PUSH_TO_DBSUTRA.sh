#!/bin/bash
# DBSutra Fresh Push Script
# Run this after creating the repo on GitHub

set -e

echo "=== Preparing fresh push to DBSutra ==="

# Backup current git
cd /Users/amit/Development/DBclientie
cp -r .git .git.backup

# Remove old git history
rm -rf .git

# Initialize fresh repo
git init
git checkout -b main

# Add all files
git add -A

# Create initial commit
git commit -m "feat: DBSutra v0.1.0-beta.1 — Initial release

A modern, cross-platform database client supporting:
- PostgreSQL, MySQL, SQLite, MongoDB, Redis, Elasticsearch
- SSH tunneling with host key verification
- AES-256-GCM encrypted password storage
- Auto-update system
- Multi-platform builds (macOS, Windows, Linux)

Backend: Go + Wails v3
Frontend: React 19 + TypeScript + Vite
License: AGPL-3.0

Co-Authored-By: Claude <noreply@anthropic.com>"

# Add remote (user needs to update this URL)
echo ""
echo "Now run these commands:"
echo ""
echo "  git remote add origin https://github.com/DBSutra/ClientDB.git"
echo "  git push -u origin main"
echo ""
echo "Or if you named the repo differently, update the URL above."
