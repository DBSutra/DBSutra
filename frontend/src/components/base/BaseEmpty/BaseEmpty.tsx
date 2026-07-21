/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'
import './BaseEmpty.css'

export interface BaseEmptyProps {
  icon?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export const BaseEmpty: React.FC<BaseEmptyProps> = ({
  icon = 'circle',
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`base-empty ${className}`}>
      <Icon name={icon} size={28} className="base-empty-icon" />
      <div className="base-empty-title">{title}</div>
      {subtitle && <div className="base-empty-subtitle">{subtitle}</div>}
      {action && <div className="base-empty-action">{action}</div>}
    </div>
  )
}
