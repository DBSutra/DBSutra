/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'

interface LoadingSpinnerProps {
  message?: string
  size?: number
}

/**
 * Reusable loading spinner component.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 24,
}) => (
  <div className="loading-spinner">
    <Icon name="loader" size={size} className="loading-spinner-icon" />
    {message && <span className="loading-spinner-message">{message}</span>}
  </div>
)
