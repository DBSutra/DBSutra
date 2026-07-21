// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import (
	"context"
	"fmt"
	"net"
	"sync"

	clog "clientdb/backend/log"
)

var log = clog.New("db")

// Service manages all database connections
type Service struct {
	ctx         context.Context
	mu          sync.RWMutex
	connections map[string]*activeConn
	drivers     map[string]func() Driver
}

// NewService creates a new DB service (drivers must be registered separately)
func NewService() *Service {
	log.Debug("NewService created")
	return &Service{
		connections: make(map[string]*activeConn),
		drivers:     make(map[string]func() Driver),
	}
}

func (s *Service) SetContext(ctx context.Context) { s.ctx = ctx }

func (s *Service) RegisterDriver(driverType string, factory func() Driver) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.drivers[driverType] = factory
	log.Debug("Driver registered: %s", driverType)
}

func (s *Service) Connect(cfg ConnectionConfig) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	safe := cfg.Sanitized()
	log.Info("Connect called — type=%s host=%s port=%d db=%s user=%s ssl=%v hasSSH=%v hasConnStr=%v",
		safe.Type, safe.Host, safe.Port, safe.Database, safe.Username, safe.SSL,
		safe.SSH != nil && safe.SSH.Host != "", safe.ConnectionString != "")

	factory, ok := s.drivers[cfg.Type]
	if !ok {
		err := fmt.Errorf("unknown driver type: %q (registered: %v)", cfg.Type, s.registeredDrivers())
		log.Error("Connect failed: %v", err)
		return "", err
	}

	var tunnelListener net.Listener
	if cfg.SSH != nil && cfg.SSH.Host != "" {
		safeSSH := cfg.SSH.Sanitized()
		log.Info("SSH tunnel requested — ssh_host=%s ssh_port=%d ssh_user=%s",
			safeSSH.Host, safeSSH.Port, safeSSH.User)
		localPort, listener, err := createSSHTunnel(cfg, nil)
		if err != nil {
			log.Error("SSH tunnel creation failed: %v", err)
			return "", fmt.Errorf("SSH tunnel failed: %w", err)
		}
		tunnelListener = listener
		log.Info("SSH tunnel established — local_port=%d → %s:%d", localPort, cfg.Host, cfg.Port)
		cfg.Host = "127.0.0.1"
		cfg.Port = localPort
	}

	log.Info("Creating %s driver and connecting...", cfg.Type)
	driver := factory()
	if err := driver.Connect(cfg); err != nil {
		if tunnelListener != nil {
			tunnelListener.Close()
			log.Warn("Closed SSH tunnel after connection failure")
		}
		log.Error("Driver connect failed for %s: %v", cfg.Type, err)
		return "", fmt.Errorf("connection failed: %w", err)
	}

	connID := cfg.ID
	if connID == "" {
		connID = fmt.Sprintf("%s-%s-%d", cfg.Type, cfg.Host, cfg.Port)
	}
	s.connections[connID] = &activeConn{driver: driver, config: cfg, listener: tunnelListener}
	log.Info("Connection established — id=%s type=%s total_active=%d", connID, cfg.Type, len(s.connections))
	return connID, nil
}

func (s *Service) getConnection(connID string) (*activeConn, error) {
	s.mu.RLock()
	conn, ok := s.connections[connID]
	s.mu.RUnlock()
	if !ok {
		log.Warn("getConnection: connection not found: %s (active: %v)", connID, s.connectionIDs())
		return nil, fmt.Errorf("connection not found: %s", connID)
	}
	return conn, nil
}

func (s *Service) Query(connID string, sql string) (*QueryResult, error) {
	log.Debug("Query — conn=%s sql_len=%d", connID, len(sql))
	conn, err := s.getConnection(connID)
	if err != nil {
		return nil, err
	}
	result, err := conn.driver.Query(sql)
	if err != nil {
		log.Error("Query failed — conn=%s: %v", connID, err)
	} else if result != nil && result.Error != "" {
		log.Warn("Query returned error — conn=%s: %s", connID, result.Error)
	} else if result != nil {
		log.Debug("Query OK — conn=%s rows=%d affected=%d", connID, len(result.Rows), result.RowsAffected)
	}
	return result, err
}

func (s *Service) GetSchema(connID string) ([]SchemaDatabase, error) {
	log.Debug("GetSchema — conn=%s", connID)
	conn, err := s.getConnection(connID)
	if err != nil {
		return nil, err
	}
	schema, err := conn.driver.GetSchema()
	if err != nil {
		log.Error("GetSchema failed — conn=%s: %v", connID, err)
	} else {
		log.Debug("GetSchema OK — conn=%s databases=%d", connID, len(schema))
	}
	return schema, err
}

func (s *Service) Disconnect(connID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	conn, ok := s.connections[connID]
	if !ok {
		log.Warn("Disconnect: connection not found: %s", connID)
		return fmt.Errorf("connection not found: %s", connID)
	}
	log.Info("Disconnecting — id=%s type=%s", connID, conn.config.Type)
	err := conn.driver.Disconnect()
	if conn.listener != nil {
		conn.listener.Close()
		log.Debug("Closed SSH tunnel for %s", connID)
	}
	delete(s.connections, connID)
	if err != nil {
		log.Error("Disconnect error for %s: %v", connID, err)
	} else {
		log.Info("Disconnected — id=%s remaining_active=%d", connID, len(s.connections))
	}
	return err
}

func (s *Service) Ping(connID string) error {
	log.Debug("Ping — conn=%s", connID)
	conn, err := s.getConnection(connID)
	if err != nil {
		return err
	}
	err = conn.driver.Ping()
	if err != nil {
		log.Warn("Ping failed — conn=%s: %v", connID, err)
	}
	return err
}

func (s *Service) ListConnections() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ids := make([]string, 0, len(s.connections))
	for id := range s.connections {
		ids = append(ids, id)
	}
	log.Debug("ListConnections: %d active", len(ids))
	return ids
}

func (s *Service) InsertRow(connID, database, table string, data map[string]interface{}) error {
	log.Debug("InsertRow — conn=%s db=%s table=%s cols=%d", connID, database, table, len(data))
	conn, err := s.getConnection(connID)
	if err != nil {
		return err
	}
	err = conn.driver.InsertRow(database, table, data)
	if err != nil {
		log.Error("InsertRow failed — conn=%s db=%s table=%s: %v", connID, database, table, err)
	}
	return err
}

func (s *Service) UpdateRow(connID, database, table string, keyColumns, data map[string]interface{}) error {
	log.Debug("UpdateRow — conn=%s db=%s table=%s key_cols=%d data_cols=%d", connID, database, table, len(keyColumns), len(data))
	conn, err := s.getConnection(connID)
	if err != nil {
		return err
	}
	err = conn.driver.UpdateRow(database, table, keyColumns, data)
	if err != nil {
		log.Error("UpdateRow failed — conn=%s db=%s table=%s: %v", connID, database, table, err)
	}
	return err
}

func (s *Service) DeleteRow(connID, database, table string, keyColumns map[string]interface{}) error {
	log.Debug("DeleteRow — conn=%s db=%s table=%s key_cols=%d", connID, database, table, len(keyColumns))
	conn, err := s.getConnection(connID)
	if err != nil {
		return err
	}
	err = conn.driver.DeleteRow(database, table, keyColumns)
	if err != nil {
		log.Error("DeleteRow failed — conn=%s db=%s table=%s: %v", connID, database, table, err)
	}
	return err
}

func (s *Service) CloseAll() {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := len(s.connections)
	log.Info("CloseAll — closing %d connection(s)", count)
	for id, conn := range s.connections {
		if err := conn.driver.Disconnect(); err != nil {
			log.Warn("CloseAll: error disconnecting %s: %v", id, err)
		}
		if conn.listener != nil {
			conn.listener.Close()
		}
		delete(s.connections, id)
	}
	log.Info("CloseAll complete")
}

// registeredDrivers returns a list of registered driver names (for error messages)
func (s *Service) registeredDrivers() []string {
	names := make([]string, 0, len(s.drivers))
	for name := range s.drivers {
		names = append(names, name)
	}
	return names
}

// connectionIDs returns a list of active connection IDs (for log messages)
func (s *Service) connectionIDs() []string {
	ids := make([]string, 0, len(s.connections))
	for id := range s.connections {
		ids = append(ids, id)
	}
	return ids
}
