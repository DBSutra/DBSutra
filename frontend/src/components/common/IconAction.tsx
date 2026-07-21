/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'

interface IconActionProps {
  icon: string
  size?: number
  title?: string
  disabled?: boolean
  active?: boolean
  danger?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
}

/**
 * Reusable icon action button component.
 * Follows tiny-rdm pattern for consistent button styling.
 */
export const IconAction: React.FC<IconActionProps> = ({
  icon,
  size = 14,
  title,
  disabled = false,
  active = false,
  danger = false,
  onClick,
  className = '',
}) => {
  const classes = [
    'icon-button',
    active && 'icon-button-active',
    danger && 'icon-button-danger',
    disabled && 'icon-button-disabled',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      title={title}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
