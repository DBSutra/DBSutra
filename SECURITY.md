# Security Policy

## Supported Versions

The following versions of DBSutra are currently supported with security
updates:

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in DBSutra, please report it
responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

Send an email to **dropmail.amit@gmail.com** with the following information:

- **Subject:** `[SECURITY] DBSutra - <brief description>`
- **Description:** A detailed description of the vulnerability
- **Steps to reproduce:** Clear steps to reproduce the issue
- **Impact:** Your assessment of the potential impact
- **Affected version(s):** Which version(s) of DBSutra are affected
- **Suggested fix:** (optional) If you have a recommendation for a fix

### What to Expect

- **Acknowledgment:** You will receive an acknowledgment within 48 hours.
- **Assessment:** The vulnerability will be assessed and prioritized within
  7 days.
- **Fix timeline:** Critical vulnerabilities will be patched within 30 days.
  Lower severity issues will be addressed in the next scheduled release.
- **Disclosure:** Once a fix is available, a security advisory will be
  published. We follow coordinated disclosure -- please do not disclose the
  vulnerability publicly until a fix has been released.

### Scope

The following are in scope for security reports:

- **Authentication bypass** in database connections
- **Credential exposure** -- passwords, SSH keys, or tokens leaked in logs,
  error messages, or the UI
- **SQL/NoSQL injection** through the query interface
- **SSH tunnel vulnerabilities** -- tunnel hijacking, port forwarding issues
- **Local data exposure** -- unauthorized access to the SQLite state store
  (`~/.dbsutra/state.db`)
- **Dependency vulnerabilities** -- known CVEs in bundled dependencies

### Out of Scope

- Social engineering attacks
- Physical access to the user's machine
- Vulnerabilities in third-party database servers themselves
- Issues requiring root/admin access to the local machine

## Security Measures

DBSutra implements the following security measures:

### Data Storage

- **Local-only storage:** All user data (connections, settings, query history)
  is stored locally in `~/.dbsutra/state.db`. No data is transmitted to
  external servers.
- **No telemetry:** DBSutra does not phone home or transmit usage data.

### Database Connections

- **Driver isolation:** Each database driver runs in its own Go goroutine with
  explicit error boundaries.
- **Connection cleanup:** All active database connections and SSH tunnels are
  closed on application shutdown.
- **SSL/TLS support:** SSL connections are supported for MySQL, PostgreSQL,
  and MongoDB.

### SSH Tunnels

- **Ephemeral tunnels:** SSH tunnels use dynamically assigned local ports and
  are torn down when the connection is closed.
- **Key-based and password authentication:** Both SSH key file and password
  authentication are supported.

### Build and Dependencies

- **Dependency pinning:** Go modules and npm packages are locked via
  `go.sum` and `package-lock.json`.
- **Linting:** Go code is checked with `golangci-lint`; TypeScript is checked
  with ESLint and Prettier.
