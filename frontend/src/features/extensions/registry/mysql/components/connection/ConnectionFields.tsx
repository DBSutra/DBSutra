/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { SSHConfig } from '@core/types'
import { Icon } from '@primitives'
import { DB_DEFAULTS } from '@config/defaults'
import type { FormState } from './useConnectionForm'
import { SSHTunnelFields } from './SSHTunnelFields'

interface Props {
  form: FormState
  update: (key: keyof FormState, value: unknown) => void
  updateSSH: (key: keyof SSHConfig, value: string | number) => void
}

export const ConnectionFields: React.FC<Props> = ({ form, update, updateSSH }) => {
  const isFile = form.type === 'sqlite'
  const isKV = form.type === 'redis'
  const isES = form.type === 'elasticsearch'

  return (
    <>
      {!isFile && (
        <div className="cf-field">
          <label>Input Mode</label>
          <div className="cf-mode-toggle">
            <button className={`cf-mode-btn ${form.inputMode === 'structured' ? 'active' : ''}`} onClick={() => update('inputMode', 'structured')}>
              <Icon name="settings" size={13} /><span>Structured</span>
            </button>
            <button className={`cf-mode-btn ${form.inputMode === 'connectionString' ? 'active' : ''}`} onClick={() => update('inputMode', 'connectionString')}>
              <Icon name="code" size={13} /><span>Connection String</span>
            </button>
          </div>
        </div>
      )}

      {form.inputMode === 'connectionString' && !isFile && (
        <div className="cf-field">
          <label>Connection String</label>
          <textarea className="cf-input cf-textarea" rows={3} value={form.connectionString}
            placeholder={form.type === 'mysql' ? 'user:password@tcp(host:3306)/database' : form.type === 'postgres' ? 'postgres://user:password@host:5432/database?sslmode=disable' : form.type === 'mongodb' ? 'mongodb://user:password@host:27017/database' : form.type === 'redis' ? 'host:6379' : 'http://host:9200'}
            onChange={(e) => update('connectionString', e.target.value)} />
        </div>
      )}

      {form.inputMode === 'structured' && (
        <>
          <div className="cf-field">
            <label>Connection Name</label>
            <input className="cf-input" placeholder={`My ${DB_DEFAULTS[form.type].label} connection`} value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          {isFile && <div className="cf-field"><label>Database File Path</label><input className="cf-input" placeholder="/path/to/database.db" value={form.database} onChange={(e) => update('database', e.target.value)} /><span className="cf-hint">Absolute path or &quot;:memory:&quot;</span></div>}
          {!isFile && <div className="cf-row"><div className="cf-field cf-grow"><label>Host</label><input className="cf-input" placeholder="127.0.0.1" value={form.host} onChange={(e) => update('host', e.target.value)} /></div><div className="cf-field cf-port"><label>Port</label><input className="cf-input" type="number" value={form.port} onChange={(e) => update('port', e.target.value)} /></div></div>}
          {!isFile && !isKV && <div className="cf-field"><label>{isES ? 'Index' : 'Database'}</label><input className="cf-input" placeholder={DB_DEFAULTS[form.type]?.placeholder} value={form.database} onChange={(e) => update('database', e.target.value)} /></div>}
          {isKV && <div className="cf-field"><label>DB Index</label><input className="cf-input" type="number" placeholder="0" value={form.database} onChange={(e) => update('database', e.target.value)} /><span className="cf-hint">Redis database index (0-15)</span></div>}
          {!isFile && !isKV && <div className="cf-row"><div className="cf-field cf-grow"><label>Username</label><input className="cf-input" placeholder={form.type === 'mongodb' ? 'admin' : isES ? 'elastic (optional)' : 'root'} value={form.username} onChange={(e) => update('username', e.target.value)} /></div><div className="cf-field cf-grow"><label>Password</label><div className="cf-password-wrap"><input className="cf-input" type="password" placeholder="Enter password" value={form.password} onChange={(e) => update('password', e.target.value)} /><Icon name="lock" size={13} className="cf-password-icon" /></div></div></div>}
          {isKV && <div className="cf-field"><label>Password</label><div className="cf-password-wrap"><input className="cf-input" type="password" placeholder="Leave empty if none" value={form.password} onChange={(e) => update('password', e.target.value)} /><Icon name="lock" size={13} className="cf-password-icon" /></div></div>}
          {!isFile && !isKV && <div className="cf-field cf-checkbox-row"><label className="cf-checkbox-label"><input type="checkbox" checked={form.ssl} onChange={(e) => update('ssl', e.target.checked)} /><Icon name={form.ssl ? 'lock' : 'unlock'} size={13} /><span>{isES ? 'Use HTTPS' : 'Use SSL/TLS'}</span></label></div>}
          {!isFile && <SSHTunnelFields form={form} update={update} updateSSH={updateSSH} />}
        </>
      )}
    </>
  )
}
