# DBSutra

A modular, extensible desktop database client built with Go and Wails.

## Download

Download the latest release for your platform from the [Releases](../../releases/latest) page.

## Installation

### macOS

1. Download the `.dmg` file
2. Open the DMG and drag **DBSutra** to **Applications**
3. **First launch**: Right-click the app and select "Open" (required for unsigned apps)
4. Click "Open" in the security dialog

> **Note**: macOS blocks unsigned apps by default. You need to right-click → Open on first launch.

### Windows

1. Download the `.zip` file
2. Extract and run `DBSutra.exe`

### Linux

**DEB (Debian/Ubuntu):**
```bash
sudo dpkg -i DBSutra-Linux-amd64.deb
```

**AppImage:**
```bash
chmod +x DBSutra-Linux-x86_64.AppImage
./DBSutra-Linux-x86_64.AppImage
```

## Development

```bash
# Install dependencies
cd frontend && npm install

# Run in development mode
wails3 dev

# Build for production
wails3 build
```

## Building from Source

```bash
# macOS
wails3 task darwin:package

# Windows
wails3 task windows:build

# Linux
wails3 task linux:package
```

## License

Proprietary Software License. See [LICENSE](./LICENSE) for details.
