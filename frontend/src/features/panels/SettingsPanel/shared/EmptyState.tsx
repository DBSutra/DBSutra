/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'

export interface EmptyStateProps {
  icon?: string
  message: string
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search',
  message,
  className = '',
}) => {
  return (
    <div className={className}>
      <Icon name={icon} size={20} />
      <span>{message}</span>
    </div>
  )
}
