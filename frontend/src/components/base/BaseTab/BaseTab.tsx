/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'
import './BaseTab.css'

export interface BaseTabProps {
  id: string
  label: string
  icon?: string
  isActive?: boolean
  isDirty?: boolean
  closable?: boolean
  onClick?: (id: string) => void
  onClose?: (id: string) => void
  onDoubleClick?: (id: string) => void
  className?: string
}

export const BaseTab: React.FC<BaseTabProps> = ({
  id,
  label,
  icon,
  isActive = false,
  isDirty = false,
  closable = true,
  onClick,
  onClose,
  onDoubleClick,
  className = '',
}) => {
  return (
    <div
      className={[
        'base-tab',
        isActive ? 'base-tab-active' : '',
        isDirty ? 'base-tab-dirty' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={() => onClick?.(id)}
      onDoubleClick={() => onDoubleClick?.(id)}
    >
      {icon && (
        <Icon name={icon} size={13} className="base-tab-icon" />
      )}
      <span className="base-tab-label">{label}</span>
      {isDirty && <span className="base-tab-dot" />}
      {closable && (
        <button
          className="base-tab-close"
          onClick={(e) => {
            e.stopPropagation()
            onClose?.(id)
          }}
          title="Close"
        >
          <Icon name="close" size={11} />
        </button>
      )}
    </div>
  )
}
