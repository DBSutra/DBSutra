/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'

type StatusType = 'connected' | 'disconnected' | 'connecting' | 'error'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: number
}

/**
 * Reusable status badge component.
 * Shows connection status with colored dot.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 8,
}) => (
  <div className="status-badge">
    <div
      className={`status-dot status-${status}`}
      style={{ width: size, height: size }}
    />
    {label && <span className="status-label">{label}</span>}
  </div>
)
