/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon, Button, IconButton } from '@primitives'
import { useConnectionForm } from './useConnectionForm'
import { StepIndicator } from './StepIndicator'
import { DatabaseTypeSelector } from './DatabaseTypeSelector'
import { ConnectionFields } from './ConnectionFields'
import '../ConnectionForm.css'

interface Props {
  dbType?: string
  onSuccess?: (connId: string) => void
  onCancel?: () => void
}

export const ConnectionForm: React.FC<Props> = ({ dbType = 'mysql', onSuccess, onCancel }) => {
  const { step, setStep, loading, error, form, update, updateSSH, handleConnect } = useConnectionForm(dbType)

  return (
    <div className="connection-form">
      <div className="cf-header">
        <div className="cf-header-left">
          <Icon name="plug-zap" size={18} />
          <div>
            <div className="cf-title">New Connection</div>
            <div className="cf-subtitle">Step {step} of 2</div>
          </div>
        </div>
        <IconButton icon="close" size={16} onClick={onCancel} title="Close" />
      </div>

      <StepIndicator step={step} />

      <div className="cf-body">
        {step === 1 && <DatabaseTypeSelector selected={form.type} onSelect={(t) => update('type', t)} />}
        {step === 2 && <ConnectionFields form={form} update={update} updateSSH={updateSSH} />}
        {error && <div className="cf-error"><Icon name="warning" size={14} /><span>{error}</span></div>}
      </div>

      <div className="cf-footer">
        <div className="cf-footer-left">
          {step === 2 && <Button variant="ghost" size="md" icon="chevron-left" onClick={() => setStep(1)}>Back</Button>}
        </div>
        <div className="cf-footer-right">
          <Button variant="ghost" size="md" onClick={onCancel}>Cancel</Button>
          {step === 1 ? (
            <Button variant="primary" size="md" iconRight="chevron-right" onClick={() => setStep(2)}>Next</Button>
          ) : (
            <Button variant="primary" size="md" icon={loading ? 'loader' : 'plug-zap'} loading={loading} onClick={() => handleConnect(onSuccess)}>
              {loading ? 'Connecting' : 'Connect'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
