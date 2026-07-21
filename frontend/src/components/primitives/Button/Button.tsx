/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '../Icon'
import './Button.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  iconRight?: string
  loading?: boolean
  block?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  block = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14

  return (
    <button
      className={[
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        block ? 'btn-block' : '',
        loading ? 'btn-loading' : '',
        !children ? 'btn-icon-only' : '',
        className,
      ].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Icon name="loader" size={iconSize} className="btn-spinner" />
      ) : icon ? (
        <Icon name={icon} size={iconSize} />
      ) : null}
      {children && <span className="btn-label">{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </button>
  )
}

// Icon-only button used in toolbars
export const IconButton: React.FC<{
  icon: string
  size?: number
  title?: string
  className?: string
  active?: boolean
  danger?: boolean
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
}> = ({ icon, size = 16, title, className = '', active, danger, onClick, disabled }) => (
  <button
    className={[
      'icon-btn',
      active ? 'icon-btn-active' : '',
      danger ? 'icon-btn-danger' : '',
      className,
    ].filter(Boolean).join(' ')}
    onClick={onClick}
    title={title}
    disabled={disabled}
  >
    <Icon name={icon} size={size} />
  </button>
)
