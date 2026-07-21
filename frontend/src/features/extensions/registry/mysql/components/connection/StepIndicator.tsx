/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import type { Step } from './useConnectionForm'

interface Props {
  step: Step
}

export const StepIndicator: React.FC<Props> = ({ step }) => (
  <div className="cf-steps">
    <div className={`cf-step ${step === 1 ? 'active' : 'completed'}`}>
      <span className="cf-step-number">{step > 1 ? '✓' : '1'}</span>
      <span>Select Database</span>
    </div>
    <div className="cf-step-divider" />
    <div className={`cf-step ${step === 2 ? 'active' : ''}`}>
      <span className="cf-step-number">2</span>
      <span>Connection Details</span>
    </div>
  </div>
)
