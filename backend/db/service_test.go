// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package db

import (
	"errors"
	"sort"
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DRIVER — implements the Driver interface for testing
// ══════════════════════════════════════════════════════════════════════════════

type mockDriver struct {
	connected      bool
	connectErr     error
	queryResult    *QueryResult
	queryErr       error
	queryCalls     []string
	schema         []SchemaDatabase
	schemaErr      error
	disconnectErr  error
	disconnected   bool
	pingErr        error
	pingCalled     bool
	insertErr      error
	insertCalls    []insertCall
	updateErr      error
	updateCalls    []updateCall
	deleteErr      error
	deleteCalls    []deleteCall
}

type insertCall struct {
	database string
	table    string
	data     map[string]interface{}
}

type updateCall struct {
	database   string
	table      string
	keyColumns map[string]interface{}
	data       map[string]interface{}
}

type deleteCall struct {
	database   string
	table      string
	keyColumns map[string]interface{}
}

func (m *mockDriver) Type() string { return "mock" }

func (m *mockDriver) Connect(cfg ConnectionConfig) error {
	if m.connectErr != nil {
		return m.connectErr
	}
	m.connected = true
	return nil
}

func (m *mockDriver) Query(sql string) (*QueryResult, error) {
	m.queryCalls = append(m.queryCalls, sql)
	return m.queryResult, m.queryErr
}

func (m *mockDriver) GetSchema() ([]SchemaDatabase, error) {
	return m.schema, m.schemaErr
}

func (m *mockDriver) Disconnect() error {
	m.disconnected = true
	return m.disconnectErr
}

func (m *mockDriver) Ping() error {
	m.pingCalled = true
	return m.pingErr
}

func (m *mockDriver) InsertRow(database, table string, data map[string]interface{}) error {
	m.insertCalls = append(m.insertCalls, insertCall{database: database, table: table, data: data})
	return m.insertErr
}

func (m *mockDriver) UpdateRow(database, table string, keyColumns, data map[string]interface{}) error {
	m.updateCalls = append(m.updateCalls, updateCall{database: database, table: table, keyColumns: keyColumns, data: data})
	return m.updateErr
}

func (m *mockDriver) DeleteRow(database, table string, keyColumns map[string]interface{}) error {
	m.deleteCalls = append(m.deleteCalls, deleteCall{database: database, table: table, keyColumns: keyColumns})
	return m.deleteErr
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

func newTestService() (*Service, *mockDriver) {
	svc := NewService()
	mock := &mockDriver{}
	svc.RegisterDriver("mock", func() Driver { return mock })
	return svc, mock
}

func connectMock(t *testing.T, svc *Service, id string) string {
	t.Helper()
	connID, err := svc.Connect(ConnectionConfig{
		Type:     "mock",
		Host:     "localhost",
		Port:     3306,
		Database: "testdb",
		ID:       id,
	})
	if err != nil {
		t.Fatalf("connectMock: unexpected error: %v", err)
	}
	return connID
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

func TestNewService(t *testing.T) {
	svc := NewService()
	if svc == nil {
		t.Fatal("NewService returned nil")
	}
	if svc.connections == nil {
		t.Error("connections map is nil")
	}
	if svc.drivers == nil {
		t.Error("drivers map is nil")
	}
	if len(svc.connections) != 0 {
		t.Errorf("expected 0 connections, got %d", len(svc.connections))
	}
	if len(svc.drivers) != 0 {
		t.Errorf("expected 0 drivers, got %d", len(svc.drivers))
	}
}

func TestRegisterDriver(t *testing.T) {
	svc := NewService()

	mock := &mockDriver{}
	svc.RegisterDriver("mockdb", func() Driver { return mock })

	if _, ok := svc.drivers["mockdb"]; !ok {
		t.Error("driver 'mockdb' was not registered")
	}

	// Register a second driver to ensure multiple registrations work.
	mock2 := &mockDriver{}
	svc.RegisterDriver("another", func() Driver { return mock2 })

	if len(svc.drivers) != 2 {
		t.Errorf("expected 2 registered drivers, got %d", len(svc.drivers))
	}
}

func TestConnect_UnknownDriver(t *testing.T) {
	svc := NewService()

	_, err := svc.Connect(ConnectionConfig{
		Type: "nonexistent",
		Host: "localhost",
		Port: 5432,
	})
	if err == nil {
		t.Fatal("expected error for unknown driver, got nil")
	}
	want := `unknown driver type: "nonexistent"`
	if got := err.Error(); got != want {
		// Only check prefix because the registered list may vary.
		if len(got) < len(want) || got[:len(want)] != want {
			t.Errorf("error = %q, want prefix %q", got, want)
		}
	}
}

func TestConnect_ValidDriver(t *testing.T) {
	svc, mock := newTestService()

	connID, err := svc.Connect(ConnectionConfig{
		Type:     "mock",
		Host:     "127.0.0.1",
		Port:     3306,
		Database: "mydb",
		ID:       "test-conn-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if connID != "test-conn-1" {
		t.Errorf("connID = %q, want %q", connID, "test-conn-1")
	}
	if !mock.connected {
		t.Error("driver.Connect was not called")
	}
}

func TestConnect_AutoGeneratedID(t *testing.T) {
	svc, _ := newTestService()

	connID, err := svc.Connect(ConnectionConfig{
		Type: "mock",
		Host: "db.example.com",
		Port: 5432,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// When no ID is provided, the service generates one from type-host-port.
	want := "mock-db.example.com-5432"
	if connID != want {
		t.Errorf("connID = %q, want %q", connID, want)
	}
}

func TestConnect_DriverConnectError(t *testing.T) {
	svc := NewService()
	svc.RegisterDriver("mock", func() Driver {
		return &mockDriver{connectErr: errors.New("connection refused")}
	})

	_, err := svc.Connect(ConnectionConfig{Type: "mock", Host: "localhost", Port: 3306})
	if err == nil {
		t.Fatal("expected error when driver.Connect fails, got nil")
	}
}

func TestGetConnection_NotFound(t *testing.T) {
	svc := NewService()

	_, err := svc.getConnection("does-not-exist")
	if err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
	want := "connection not found: does-not-exist"
	if err.Error() != want {
		t.Errorf("error = %q, want %q", err.Error(), want)
	}
}

func TestQuery_DelegatesToDriver(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	expected := &QueryResult{
		Columns: []string{"id", "name"},
		Rows:    [][]interface{}{{int64(1), "Alice"}, {int64(2), "Bob"}},
	}
	mock.queryResult = expected

	result, err := svc.Query("c1", "SELECT id, name FROM users")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Columns) != 2 {
		t.Errorf("expected 2 columns, got %d", len(result.Columns))
	}
	if len(result.Rows) != 2 {
		t.Errorf("expected 2 rows, got %d", len(result.Rows))
	}
	if len(mock.queryCalls) != 1 {
		t.Fatalf("expected 1 query call, got %d", len(mock.queryCalls))
	}
	if mock.queryCalls[0] != "SELECT id, name FROM users" {
		t.Errorf("query = %q, want %q", mock.queryCalls[0], "SELECT id, name FROM users")
	}
}

func TestQuery_ConnectionNotFound(t *testing.T) {
	svc, _ := newTestService()

	_, err := svc.Query("nonexistent", "SELECT 1")
	if err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
}

func TestQuery_DriverError(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	mock.queryErr = errors.New("syntax error")
	_, err := svc.Query("c1", "BAD SQL")
	if err == nil {
		t.Fatal("expected error from driver, got nil")
	}
	if err.Error() != "syntax error" {
		t.Errorf("error = %q, want %q", err.Error(), "syntax error")
	}
}

func TestGetSchema_DelegatesToDriver(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	mock.schema = []SchemaDatabase{
		{
			Name: "testdb",
			Tables: []SchemaTable{
				{
					Name: "users",
					Columns: []SchemaColumn{
						{Name: "id", Type: "INT", Key: "PRI"},
						{Name: "name", Type: "VARCHAR"},
					},
				},
			},
		},
	}

	schema, err := svc.GetSchema("c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(schema) != 1 {
		t.Fatalf("expected 1 database, got %d", len(schema))
	}
	if schema[0].Name != "testdb" {
		t.Errorf("database name = %q, want %q", schema[0].Name, "testdb")
	}
	if len(schema[0].Tables) != 1 {
		t.Fatalf("expected 1 table, got %d", len(schema[0].Tables))
	}
	if schema[0].Tables[0].Name != "users" {
		t.Errorf("table name = %q, want %q", schema[0].Tables[0].Name, "users")
	}
}

func TestGetSchema_ConnectionNotFound(t *testing.T) {
	svc, _ := newTestService()

	_, err := svc.GetSchema("nonexistent")
	if err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
}

func TestDisconnect_RemovesConnection(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	if len(svc.ListConnections()) != 1 {
		t.Fatal("expected 1 connection before disconnect")
	}

	err := svc.Disconnect("c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !mock.disconnected {
		t.Error("driver.Disconnect was not called")
	}
	if len(svc.ListConnections()) != 0 {
		t.Errorf("expected 0 connections after disconnect, got %d", len(svc.ListConnections()))
	}
}

func TestDisconnect_NotFound(t *testing.T) {
	svc := NewService()

	err := svc.Disconnect("nonexistent")
	if err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
}

func TestDisconnect_DriverError(t *testing.T) {
	svc := NewService()
	mock := &mockDriver{disconnectErr: errors.New("close failed")}
	svc.RegisterDriver("mock", func() Driver { return mock })

	connectMock(t, svc, "c1")

	err := svc.Disconnect("c1")
	if err == nil {
		t.Fatal("expected error from driver.Disconnect, got nil")
	}
	// Connection should still be removed even if disconnect fails.
	if len(svc.ListConnections()) != 0 {
		t.Error("connection should be removed even if driver.Disconnect returns error")
	}
}

func TestPing_DelegatesToDriver(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	if err := svc.Ping("c1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !mock.pingCalled {
		t.Error("driver.Ping was not called")
	}
}

func TestPing_Error(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	mock.pingErr = errors.New("ping timeout")
	if err := svc.Ping("c1"); err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestPing_ConnectionNotFound(t *testing.T) {
	svc, _ := newTestService()

	if err := svc.Ping("nonexistent"); err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
}

func TestListConnections(t *testing.T) {
	svc, _ := newTestService()

	ids := svc.ListConnections()
	if len(ids) != 0 {
		t.Errorf("expected 0 connections, got %d", len(ids))
	}

	connectMock(t, svc, "c1")
	connectMock(t, svc, "c2")
	connectMock(t, svc, "c3")

	ids = svc.ListConnections()
	if len(ids) != 3 {
		t.Fatalf("expected 3 connections, got %d", len(ids))
	}

	sort.Strings(ids)
	want := []string{"c1", "c2", "c3"}
	for i, w := range want {
		if ids[i] != w {
			t.Errorf("ids[%d] = %q, want %q", i, ids[i], w)
		}
	}
}

func TestInsertRow_DelegatesToDriver(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	data := map[string]interface{}{"name": "Alice", "age": 30}
	err := svc.InsertRow("c1", "testdb", "users", data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(mock.insertCalls) != 1 {
		t.Fatalf("expected 1 insert call, got %d", len(mock.insertCalls))
	}
	call := mock.insertCalls[0]
	if call.database != "testdb" {
		t.Errorf("database = %q, want %q", call.database, "testdb")
	}
	if call.table != "users" {
		t.Errorf("table = %q, want %q", call.table, "users")
	}
	if call.data["name"] != "Alice" || call.data["age"] != 30 {
		t.Errorf("data = %v, want {name: Alice, age: 30}", call.data)
	}
}

func TestInsertRow_ConnectionNotFound(t *testing.T) {
	svc, _ := newTestService()

	err := svc.InsertRow("nonexistent", "db", "tbl", map[string]interface{}{"a": 1})
	if err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
}

func TestInsertRow_DriverError(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	mock.insertErr = errors.New("duplicate key")
	err := svc.InsertRow("c1", "db", "tbl", map[string]interface{}{"a": 1})
	if err == nil {
		t.Fatal("expected error from driver, got nil")
	}
}

func TestUpdateRow_DelegatesToDriver(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	keyCols := map[string]interface{}{"id": 1}
	data := map[string]interface{}{"name": "Bob"}
	err := svc.UpdateRow("c1", "testdb", "users", keyCols, data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(mock.updateCalls) != 1 {
		t.Fatalf("expected 1 update call, got %d", len(mock.updateCalls))
	}
	call := mock.updateCalls[0]
	if call.database != "testdb" {
		t.Errorf("database = %q, want %q", call.database, "testdb")
	}
	if call.table != "users" {
		t.Errorf("table = %q, want %q", call.table, "users")
	}
	if call.keyColumns["id"] != 1 {
		t.Errorf("keyColumns = %v, want {id: 1}", call.keyColumns)
	}
	if call.data["name"] != "Bob" {
		t.Errorf("data = %v, want {name: Bob}", call.data)
	}
}

func TestUpdateRow_ConnectionNotFound(t *testing.T) {
	svc, _ := newTestService()

	err := svc.UpdateRow("nonexistent", "db", "tbl", map[string]interface{}{"id": 1}, map[string]interface{}{"a": 2})
	if err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
}

func TestUpdateRow_DriverError(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	mock.updateErr = errors.New("update failed")
	err := svc.UpdateRow("c1", "db", "tbl", map[string]interface{}{"id": 1}, map[string]interface{}{"a": 2})
	if err == nil {
		t.Fatal("expected error from driver, got nil")
	}
}

func TestDeleteRow_DelegatesToDriver(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	keyCols := map[string]interface{}{"id": 42}
	err := svc.DeleteRow("c1", "testdb", "users", keyCols)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(mock.deleteCalls) != 1 {
		t.Fatalf("expected 1 delete call, got %d", len(mock.deleteCalls))
	}
	call := mock.deleteCalls[0]
	if call.database != "testdb" {
		t.Errorf("database = %q, want %q", call.database, "testdb")
	}
	if call.table != "users" {
		t.Errorf("table = %q, want %q", call.table, "users")
	}
	if call.keyColumns["id"] != 42 {
		t.Errorf("keyColumns = %v, want {id: 42}", call.keyColumns)
	}
}

func TestDeleteRow_ConnectionNotFound(t *testing.T) {
	svc, _ := newTestService()

	err := svc.DeleteRow("nonexistent", "db", "tbl", map[string]interface{}{"id": 1})
	if err == nil {
		t.Fatal("expected error for non-existent connection, got nil")
	}
}

func TestDeleteRow_DriverError(t *testing.T) {
	svc, mock := newTestService()
	connectMock(t, svc, "c1")

	mock.deleteErr = errors.New("delete failed")
	err := svc.DeleteRow("c1", "db", "tbl", map[string]interface{}{"id": 1})
	if err == nil {
		t.Fatal("expected error from driver, got nil")
	}
}

func TestCloseAll(t *testing.T) {
	svc, _ := newTestService()

	// Create multiple connections, each with its own mock driver.
	drivers := make([]*mockDriver, 3)
	for i := range drivers {
		d := &mockDriver{}
		drivers[i] = d
		idx := i
		svc.RegisterDriver("mock", func() Driver { return drivers[idx] })
		// We overwrite the factory each time, so we need a different approach.
		// Use separate service instances or track per-connection.
	}

	// Simpler approach: create a fresh service and register one factory
	// that returns different mock drivers keyed by connection index.
	svc = NewService()
	var createdDrivers []*mockDriver
	callCount := 0
	svc.RegisterDriver("mock", func() Driver {
		d := &mockDriver{}
		createdDrivers = append(createdDrivers, d)
		callCount++
		return d
	})

	connectMock(t, svc, "c1")
	connectMock(t, svc, "c2")
	connectMock(t, svc, "c3")

	if len(svc.ListConnections()) != 3 {
		t.Fatalf("expected 3 connections before CloseAll, got %d", len(svc.ListConnections()))
	}

	svc.CloseAll()

	if len(svc.ListConnections()) != 0 {
		t.Errorf("expected 0 connections after CloseAll, got %d", len(svc.ListConnections()))
	}

	// Each driver should have had Disconnect called.
	for i, d := range createdDrivers {
		if !d.disconnected {
			t.Errorf("driver %d: Disconnect was not called", i)
		}
	}
}

func TestCloseAll_EmptyService(t *testing.T) {
	svc := NewService()

	// Should not panic on an empty service.
	svc.CloseAll()

	if len(svc.ListConnections()) != 0 {
		t.Errorf("expected 0 connections, got %d", len(svc.ListConnections()))
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE-DRIVEN TESTS
// ══════════════════════════════════════════════════════════════════════════════

func TestConnect_TableDriven(t *testing.T) {
	tests := []struct {
		name    string
		cfg     ConnectionConfig
		wantErr bool
		wantID  string
	}{
		{
			name: "explicit ID",
			cfg: ConnectionConfig{
				Type: "mock", Host: "localhost", Port: 3306, ID: "my-id",
			},
			wantErr: false,
			wantID:  "my-id",
		},
		{
			name: "auto-generated ID",
			cfg: ConnectionConfig{
				Type: "mock", Host: "10.0.0.1", Port: 5432,
			},
			wantErr: false,
			wantID:  "mock-10.0.0.1-5432",
		},
		{
			name: "unknown driver type",
			cfg: ConnectionConfig{
				Type: "nosuchdriver", Host: "localhost", Port: 1234,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService()
			svc.RegisterDriver("mock", func() Driver { return &mockDriver{} })

			gotID, err := svc.Connect(tt.cfg)
			if (err != nil) != tt.wantErr {
				t.Fatalf("Connect() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && gotID != tt.wantID {
				t.Errorf("Connect() gotID = %q, want %q", gotID, tt.wantID)
			}
		})
	}
}

func TestQuery_TableDriven(t *testing.T) {
	tests := []struct {
		name       string
		sql        string
		mockResult *QueryResult
		mockErr    error
		wantErr    bool
		wantRows   int
	}{
		{
			name:       "select returns rows",
			sql:        "SELECT * FROM t",
			mockResult: &QueryResult{Columns: []string{"a"}, Rows: [][]interface{}{{1}, {2}}},
			wantErr:    false,
			wantRows:   2,
		},
		{
			name:       "empty result set",
			sql:        "SELECT * FROM empty",
			mockResult: &QueryResult{Columns: []string{"x"}, Rows: nil},
			wantErr:    false,
			wantRows:   0,
		},
		{
			name:    "driver returns error",
			sql:     "BAD SQL",
			mockErr: errors.New("parse error"),
			wantErr: true,
		},
		{
			name:       "result with embedded error string",
			sql:        "SELECT * FROM t",
			mockResult: &QueryResult{Error: "table not found"},
			wantErr:    false,
			wantRows:   0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, mock := newTestService()
			connectMock(t, svc, "c1")

			mock.queryResult = tt.mockResult
			mock.queryErr = tt.mockErr

			result, err := svc.Query("c1", tt.sql)
			if (err != nil) != tt.wantErr {
				t.Fatalf("Query() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && result != nil && len(result.Rows) != tt.wantRows {
				t.Errorf("Query() rows = %d, want %d", len(result.Rows), tt.wantRows)
			}
		})
	}
}

func TestGetSchema_TableDriven(t *testing.T) {
	tests := []struct {
		name       string
		mockSchema []SchemaDatabase
		mockErr    error
		wantErr    bool
		wantDBs    int
	}{
		{
			name: "multiple databases",
			mockSchema: []SchemaDatabase{
				{Name: "db1", Tables: []SchemaTable{{Name: "t1"}}},
				{Name: "db2", Tables: []SchemaTable{{Name: "t2"}, {Name: "t3"}}},
			},
			wantErr: false,
			wantDBs: 2,
		},
		{
			name:       "empty schema",
			mockSchema: []SchemaDatabase{},
			wantErr:    false,
			wantDBs:    0,
		},
		{
			name:    "driver error",
			mockErr: errors.New("permission denied"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, mock := newTestService()
			connectMock(t, svc, "c1")

			mock.schema = tt.mockSchema
			mock.schemaErr = tt.mockErr

			schema, err := svc.GetSchema("c1")
			if (err != nil) != tt.wantErr {
				t.Fatalf("GetSchema() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && len(schema) != tt.wantDBs {
				t.Errorf("GetSchema() databases = %d, want %d", len(schema), tt.wantDBs)
			}
		})
	}
}

func TestPing_TableDriven(t *testing.T) {
	tests := []struct {
		name    string
		mockErr error
		wantErr bool
	}{
		{
			name:    "ping succeeds",
			mockErr: nil,
			wantErr: false,
		},
		{
			name:    "ping fails",
			mockErr: errors.New("host unreachable"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, mock := newTestService()
			connectMock(t, svc, "c1")
			mock.pingErr = tt.mockErr

			err := svc.Ping("c1")
			if (err != nil) != tt.wantErr {
				t.Fatalf("Ping() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !mock.pingCalled {
				t.Error("driver.Ping was not called")
			}
		})
	}
}

func TestRowOperations_TableDriven(t *testing.T) {
	tests := []struct {
		name    string
		op      string
		mockErr error
		wantErr bool
	}{
		{name: "insert succeeds", op: "insert", mockErr: nil, wantErr: false},
		{name: "insert fails", op: "insert", mockErr: errors.New("dup"), wantErr: true},
		{name: "update succeeds", op: "update", mockErr: nil, wantErr: false},
		{name: "update fails", op: "update", mockErr: errors.New("fail"), wantErr: true},
		{name: "delete succeeds", op: "delete", mockErr: nil, wantErr: false},
		{name: "delete fails", op: "delete", mockErr: errors.New("fail"), wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, mock := newTestService()
			connectMock(t, svc, "c1")

			data := map[string]interface{}{"col": "val"}
			keys := map[string]interface{}{"id": 1}
			var err error

			switch tt.op {
			case "insert":
				mock.insertErr = tt.mockErr
				err = svc.InsertRow("c1", "db", "tbl", data)
			case "update":
				mock.updateErr = tt.mockErr
				err = svc.UpdateRow("c1", "db", "tbl", keys, data)
			case "delete":
				mock.deleteErr = tt.mockErr
				err = svc.DeleteRow("c1", "db", "tbl", keys)
			}

			if (err != nil) != tt.wantErr {
				t.Fatalf("%s() error = %v, wantErr %v", tt.op, err, tt.wantErr)
			}
		})
	}
}
