/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * Reusable empty state component.
 * Follows tiny-rdm pattern for consistent empty states.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="empty-state">
    <Icon name={icon} size={48} className="empty-state-icon" />
    <div className="empty-state-title">{title}</div>
    {description && <div className="empty-state-description">{description}</div>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
)
