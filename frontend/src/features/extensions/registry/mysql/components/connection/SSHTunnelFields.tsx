/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { SSHConfig } from '@core/types'
import { Icon } from '@primitives'
import type { FormState } from './useConnectionForm'

interface Props {
  form: FormState
  update: (key: keyof FormState, value: unknown) => void
  updateSSH: (key: keyof SSHConfig, value: string | number) => void
}

export const SSHTunnelFields: React.FC<Props> = ({ form, update, updateSSH }) => (
  <div className="cf-ssh-section">
    <div className="cf-ssh-header">
      <label className="cf-checkbox-label">
        <input type="checkbox" checked={form.sshEnabled} onChange={(e) => update('sshEnabled', e.target.checked)} />
        <Icon name="lock" size={13} /><span>SSH Tunnel</span>
      </label>
      {form.sshEnabled && <span className="cf-tab-badge">ON</span>}
    </div>
    <div className="cf-ssh-fields">
      <div className="cf-row">
        <div className="cf-field cf-grow">
          <label>SSH Host</label>
          <input className="cf-input" placeholder="ssh.example.com" value={form.ssh.host} onChange={(e) => updateSSH('host', e.target.value)} disabled={!form.sshEnabled} />
        </div>
        <div className="cf-field cf-port">
          <label>Port</label>
          <input className="cf-input" type="number" value={form.ssh.port} onChange={(e) => updateSSH('port', parseInt(e.target.value) || 22)} disabled={!form.sshEnabled} />
        </div>
      </div>
      <div className="cf-field">
        <label>SSH User</label>
        <input className="cf-input" placeholder="ubuntu" value={form.ssh.user} onChange={(e) => updateSSH('user', e.target.value)} disabled={!form.sshEnabled} />
      </div>
      <div className="cf-field">
        <label>Authentication</label>
        <div className="cf-mode-toggle">
          <button className={`cf-mode-btn ${!form.ssh.keyFile ? 'active' : ''}`} onClick={() => updateSSH('keyFile', '')} disabled={!form.sshEnabled}>
            <Icon name="lock" size={13} /><span>Password</span>
          </button>
          <button className={`cf-mode-btn ${!!form.ssh.keyFile ? 'active' : ''}`} onClick={() => updateSSH('keyFile', '~/.ssh/id_rsa')} disabled={!form.sshEnabled}>
            <Icon name="key" size={13} /><span>Key File</span>
          </button>
        </div>
      </div>
      {!form.ssh.keyFile ? (
        <div className="cf-field">
          <label>SSH Password</label>
          <div className="cf-password-wrap">
            <input className="cf-input" type="password" placeholder="SSH password" value={form.ssh.password} onChange={(e) => updateSSH('password', e.target.value)} disabled={!form.sshEnabled} />
            <Icon name="lock" size={13} className="cf-password-icon" />
          </div>
        </div>
      ) : (
        <>
          <div className="cf-field">
            <label>Key File Path</label>
            <input className="cf-input" placeholder="~/.ssh/id_rsa" value={form.ssh.keyFile} onChange={(e) => updateSSH('keyFile', e.target.value)} disabled={!form.sshEnabled} />
          </div>
          <div className="cf-field">
            <label>Key Passphrase (optional)</label>
            <div className="cf-password-wrap">
              <input className="cf-input" type="password" placeholder="Passphrase for key file" value={form.ssh.keyPass || ''} onChange={(e) => updateSSH('keyPass', e.target.value)} disabled={!form.sshEnabled} />
              <Icon name="lock" size={13} className="cf-password-icon" />
            </div>
          </div>
        </>
      )}
    </div>
  </div>
)
