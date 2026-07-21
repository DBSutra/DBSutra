// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import (
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"

	clog "clientdb/backend/log"

	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/knownhosts"
)

var sshLog = clog.New("ssh")

// HostKeyCallback is a function type for handling unknown SSH host keys.
// It receives the host:port string and the public key, and returns nil to
// accept the key or an error to reject it.
type HostKeyCallback func(host string, key ssh.PublicKey) error

// defaultHostKeyCallback is the default callback that rejects unknown hosts.
func defaultHostKeyCallback(host string, key ssh.PublicKey) error {
	return fmt.Errorf("unknown host key for %s: connection rejected (add the host key to ~/.ssh/known_hosts)", host)
}

// buildHostKeyCallback creates an ssh.HostKeyCallback that checks against the
// user's known_hosts file and delegates unknown hosts to the provided callback.
func buildHostKeyCallback(onUnknown HostKeyCallback) (ssh.HostKeyCallback, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		sshLog.Warn("Cannot determine home directory for known_hosts: %v", err)
		// Fall back to callback-only mode.
		return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return onUnknown(hostname, key)
		}, nil
	}

	knownHostsPath := filepath.Join(home, ".ssh", "known_hosts")

	// Check if the known_hosts file exists; create it if not.
	if _, err := os.Stat(knownHostsPath); os.IsNotExist(err) {
		sshLog.Info("known_hosts file not found at %s — creating empty file", knownHostsPath)
		sshDir := filepath.Join(home, ".ssh")
		if err := os.MkdirAll(sshDir, 0700); err != nil {
			sshLog.Warn("Cannot create ~/.ssh directory: %v", err)
			return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
				return onUnknown(hostname, key)
			}, nil
		}
		if err := os.WriteFile(knownHostsPath, []byte(""), 0600); err != nil {
			sshLog.Warn("Cannot create known_hosts file: %v", err)
			return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
				return onUnknown(hostname, key)
			}, nil
		}
	}

	hostKeyCallback, err := knownhosts.New(knownHostsPath)
	if err != nil {
		sshLog.Warn("Cannot parse known_hosts file %s: %v", knownHostsPath, err)
		return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return onUnknown(hostname, key)
		}, nil
	}

	// Wrap the known_hosts callback to handle unknown hosts via the callback.
	return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
		err := hostKeyCallback(hostname, remote, key)
		if err == nil {
			return nil
		}

		// Check if the error is a key change (MITM warning) — always reject.
		if _, ok := err.(*knownhosts.KeyError); ok {
			sshLog.Error("HOST KEY MISMATCH for %s — possible MITM attack: %v", hostname, err)
			return fmt.Errorf("SECURITY WARNING: host key for %s does not match known_hosts (possible MITM attack): %w", hostname, err)
		}

		// Unknown host — delegate to the callback.
		sshLog.Info("Unknown host key for %s — consulting callback", hostname)
		return onUnknown(hostname, key)
	}, nil
}

// appendKnownHost adds a host key to the known_hosts file.
func appendKnownHost(host string, key ssh.PublicKey) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("cannot determine home directory: %w", err)
	}
	knownHostsPath := filepath.Join(home, ".ssh", "known_hosts")

	f, err := os.OpenFile(knownHostsPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("cannot open known_hosts for appending: %w", err)
	}
	defer f.Close()

	line := knownhosts.Line([]string{host}, key)
	if _, err := f.WriteString(line + "\n"); err != nil {
		return fmt.Errorf("cannot write to known_hosts: %w", err)
	}
	sshLog.Info("Added host key for %s to known_hosts", host)
	return nil
}

// ══════════════════════════════════════════════════════════════════════════════
// SSH TUNNEL — transparent TCP forwarding through SSH
// ══════════════════════════════════════════════════════════════════════════════

// createSSHTunnel establishes an SSH tunnel and returns a local port.
// If onUnknown is nil, unknown hosts will be rejected.
func createSSHTunnel(cfg ConnectionConfig, onUnknown HostKeyCallback) (int, net.Listener, error) {
	sshCfg := cfg.SSH
	if sshCfg.Port == 0 {
		sshCfg.Port = 22
	}

	safeSSH := sshCfg.Sanitized()
	sshLog.Info("Creating SSH tunnel — ssh=%s:%d user=%s hasKey=%v hasPass=%v",
		safeSSH.Host, safeSSH.Port, safeSSH.User, sshCfg.KeyFile != "", sshCfg.Password != "")

	// Use the default callback if none provided.
	if onUnknown == nil {
		onUnknown = defaultHostKeyCallback
	}

	hostKeyCallback, err := buildHostKeyCallback(onUnknown)
	if err != nil {
		sshLog.Error("Failed to build host key callback: %v", err)
		return 0, nil, fmt.Errorf("failed to build host key callback: %w", err)
	}

	sshConfig := &ssh.ClientConfig{
		User:            sshCfg.User,
		HostKeyCallback: hostKeyCallback,
	}

	// Authentication: password or key
	if sshCfg.KeyFile != "" {
		sshLog.Debug("Using key file auth: %s", sshCfg.KeyFile)
		signer, err := parsePrivateKey(sshCfg.KeyFile, sshCfg.KeyPass)
		if err != nil {
			sshLog.Error("Failed to parse SSH key %s: %v", sshCfg.KeyFile, err)
			return 0, nil, fmt.Errorf("failed to parse SSH key: %w", err)
		}
		sshConfig.Auth = []ssh.AuthMethod{ssh.PublicKeys(signer)}
	} else if sshCfg.Password != "" {
		sshLog.Debug("Using password auth")
		sshConfig.Auth = []ssh.AuthMethod{ssh.Password(sshCfg.Password)}
	} else {
		sshLog.Error("No SSH authentication method provided")
		return 0, nil, fmt.Errorf("SSH requires either password or key file")
	}

	// Connect to SSH server
	sshAddr := fmt.Sprintf("%s:%d", sshCfg.Host, sshCfg.Port)
	sshLog.Info("Dialing SSH server at %s...", sshAddr)
	sshConn, err := ssh.Dial("tcp", sshAddr, sshConfig)
	if err != nil {
		sshLog.Error("SSH dial failed to %s: %v", sshAddr, err)
		return 0, nil, fmt.Errorf("SSH dial failed: %w", err)
	}
	sshLog.Info("SSH connection established to %s", sshAddr)

	// Listen on a random local port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		sshConn.Close()
		sshLog.Error("Failed to listen on local port: %v", err)
		return 0, nil, fmt.Errorf("failed to listen on local port: %w", err)
	}

	localPort := listener.Addr().(*net.TCPAddr).Port
	remoteAddr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	sshLog.Info("SSH tunnel: localhost:%d → %s", localPort, remoteAddr)

	// Forward connections in the background
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				sshLog.Debug("Tunnel listener closed")
				return // listener closed
			}
			go forwardConnection(conn, sshConn, remoteAddr)
		}
	}()

	return localPort, listener, nil
}

// forwardConnection bridges a local connection to a remote address through SSH
func forwardConnection(localConn net.Conn, sshConn *ssh.Client, remoteAddr string) {
	remoteConn, err := sshConn.Dial("tcp", remoteAddr)
	if err != nil {
		sshLog.Warn("Tunnel forward failed to %s: %v", remoteAddr, err)
		localConn.Close()
		return
	}
	sshLog.Debug("Tunnel forwarding: %s → %s", localConn.RemoteAddr(), remoteAddr)
	go pipeConn(localConn, remoteConn)
	go pipeConn(remoteConn, localConn)
}

// pipeConn copies data from src to dst, closing both when done
func pipeConn(dst, src net.Conn) {
	defer dst.Close()
	defer src.Close()
	buf := make([]byte, 32*1024)
	io.CopyBuffer(dst, src, buf)
}

// parsePrivateKey parses an SSH private key from a file
func parsePrivateKey(keyFile, passphrase string) (ssh.Signer, error) {
	keyData, err := os.ReadFile(keyFile)
	if err != nil {
		return nil, err
	}
	if passphrase != "" {
		return ssh.ParsePrivateKeyWithPassphrase(keyData, []byte(passphrase))
	}
	return ssh.ParsePrivateKey(keyData)
}
