// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package elasticsearch

import (
	"clientdb/backend/db"
	clog "clientdb/backend/log"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
)

var log = clog.New("elasticsearch")

type Driver struct {
	client *elasticsearch.Client
	cfg    db.ConnectionConfig
	ctx    context.Context
}

func New() db.Driver {
	return &Driver{ctx: context.Background()}
}

func (d *Driver) Type() string { return "elasticsearch" }

func (d *Driver) Connect(cfg db.ConnectionConfig) error {
	host := cfg.Host
	if host == "" {
		host = "127.0.0.1"
	}
	port := cfg.Port
	if port == 0 {
		port = 9200
	}

	safe := cfg.Sanitized()
	log.Info("Connect: host=%s port=%d ssl=%v user=%s", host, port, safe.SSL, safe.Username)

	scheme := "http"
	if cfg.SSL {
		scheme = "https"
	}

	esCfg := elasticsearch.Config{
		Addresses: []string{fmt.Sprintf("%s://%s:%d", scheme, host, port)},
		Transport: &http.Transport{
			ResponseHeaderTimeout: 10 * time.Second,
		},
	}
	if cfg.Username != "" {
		esCfg.Username = cfg.Username
		esCfg.Password = cfg.Password
	}
	if cfg.ConnectionString != "" {
		esCfg.Addresses = []string{cfg.ConnectionString}
		log.Debug("Using connection string: %s", safe.ConnectionString)
	}

	client, err := elasticsearch.NewClient(esCfg)
	if err != nil {
		log.Error("Client creation failed: %v", err)
		return fmt.Errorf("elasticsearch client creation failed: %w", err)
	}

	res, err := client.Info()
	if err != nil {
		log.Error("Connection failed at %s:%d: %v", host, port, err)
		return fmt.Errorf("elasticsearch connection failed: %w", err)
	}
	defer res.Body.Close()
	if res.IsError() {
		log.Error("Connection error: %s", res.String())
		return fmt.Errorf("elasticsearch connection error: %s", res.String())
	}

	d.client = client
	d.cfg = cfg
	log.Info("Connected to Elasticsearch at %s://%s:%d", scheme, host, port)
	return nil
}

func (d *Driver) Disconnect() error {
	d.client = nil
	return nil
}

func (d *Driver) Ping() error {
	if d.client == nil {
		return fmt.Errorf("not connected")
	}
	res, err := d.client.Ping()
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.IsError() {
		return fmt.Errorf("ping failed: %s", res.String())
	}
	return nil
}

func (d *Driver) InsertRow(database, table string, data map[string]interface{}) error {
	docJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}
	var buf bytes.Buffer
	buf.Write(docJSON)

	req := esapi.IndexRequest{Index: table, Body: &buf, Refresh: "true"}
	res, err := req.Do(d.ctx, d.client)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.IsError() {
		return fmt.Errorf("insert failed: %s", res.String())
	}
	return nil
}

func (d *Driver) UpdateRow(database, table string, keyColumns, data map[string]interface{}) error {
	docID, ok := keyColumns["_id"].(string)
	if !ok {
		return fmt.Errorf("elasticsearch UpdateRow requires '_id' in keyColumns")
	}
	docJSON, _ := json.Marshal(map[string]interface{}{"doc": data})
	var buf bytes.Buffer
	buf.Write(docJSON)

	res, err := d.client.Update(table, docID, &buf)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.IsError() {
		return fmt.Errorf("update failed: %s", res.String())
	}
	return nil
}

func (d *Driver) DeleteRow(database, table string, keyColumns map[string]interface{}) error {
	docID, ok := keyColumns["_id"].(string)
	if !ok {
		return fmt.Errorf("elasticsearch DeleteRow requires '_id' in keyColumns")
	}
	res, err := d.client.Delete(table, docID)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.IsError() {
		return fmt.Errorf("delete failed: %s", res.String())
	}
	return nil
}
