/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useState, useCallback } from 'react'
import type { ConnectionConfig, DatabaseType, SSHConfig } from '@core/types'
import { ConnectionManager } from '@core/connections/ConnectionManager'
import { DB_DEFAULTS } from '@config/defaults'
import { useToast } from '@shared/components'

type InputMode = 'structured' | 'connectionString'
export type Step = 1 | 2

export interface FormState {
  name: string
  type: DatabaseType
  host: string
  port: string
  database: string
  username: string
  password: string
  ssl: boolean
  connectionString: string
  inputMode: InputMode
  sshEnabled: boolean
  ssh: SSHConfig
}

export function useConnectionForm(dbType: string) {
  const toast = useToast()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    name: '',
    type: dbType as DatabaseType,
    host: '127.0.0.1',
    port: String(DB_DEFAULTS[dbType as DatabaseType]?.port ?? 3306),
    database: '',
    username: (dbType === 'redis' || dbType === 'elasticsearch') ? '' : 'root',
    password: '',
    ssl: false,
    connectionString: '',
    inputMode: 'structured',
    sshEnabled: false,
    ssh: { host: '', port: 22, user: '', password: '', keyFile: '', keyPass: '' },
  })

  const update = useCallback((key: keyof FormState, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'type') {
        const dt = value as DatabaseType
        next.port = String(DB_DEFAULTS[dt]?.port ?? 3306)
        next.connectionString = ''
        if (dt === 'redis' || dt === 'elasticsearch') { next.username = ''; next.password = '' }
        else if (dt === 'sqlite') { next.host = ''; next.port = '0'; next.username = ''; next.password = ''; next.ssl = false }
        else if (prev.type === 'redis' || prev.type === 'sqlite' || prev.type === 'elasticsearch') { next.username = 'root' }
      }
      return next
    })
  }, [])

  const updateSSH = useCallback((key: keyof SSHConfig, value: string | number) => {
    setForm((prev) => ({ ...prev, ssh: { ...prev.ssh, [key]: value } }))
  }, [])

  const handleConnect = async (onSuccess?: (connId: string) => void) => {
    if (form.inputMode === 'connectionString' && form.connectionString) {
      setLoading(true); setError(null)
      const config: ConnectionConfig = {
        id: `${form.type}-connstr-${Date.now()}`, name: form.name || `${form.type} connection`,
        type: form.type, host: '', port: 0, database: '', username: '', password: '', ssl: false,
        connectionString: form.connectionString,
      }
      try {
        const connId = await ConnectionManager.connect(config, true)
        toast.success(`Connected to ${config.name}`)
        onSuccess?.(connId)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        toast.error(`Connection failed: ${msg}`)
      }
      finally { setLoading(false) }
      return
    }

    if (form.type === 'sqlite' && !form.database) { setError('Database file path is required'); return }
    if (form.type !== 'sqlite' && !form.host) { setError('Host is required'); return }

    setLoading(true); setError(null)
    const config: ConnectionConfig = {
      id: `${form.type}-${form.host || 'local'}-${Date.now()}`,
      name: form.name || (form.type === 'sqlite' ? form.database.split('/').pop() || 'sqlite' : `${form.type}@${form.host}/${form.database}`),
      type: form.type, host: form.host, port: parseInt(form.port, 10) || 0,
      database: form.database, username: form.username, password: form.password, ssl: form.ssl,
    }
    if (form.sshEnabled && form.ssh.host) config.ssh = { ...form.ssh }

    try {
      const connId = await ConnectionManager.connect(config, true)
      toast.success(`Connected to ${config.name}`)
      onSuccess?.(connId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error(`Connection failed: ${msg}`)
    }
    finally { setLoading(false) }
  }

  return { step, setStep, loading, error, setError, form, update, updateSSH, handleConnect }
}
