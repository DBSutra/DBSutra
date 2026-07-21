/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '../Icon'
import './Input.css'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string
  className?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ 
  icon, 
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className={`ui-input-wrap ${className}`}>
      {icon && <Icon name={icon} size={14} className="ui-input-icon" />}
      <input
        ref={ref}
        className={`ui-input ${icon ? 'with-icon' : ''}`}
        {...props}
      />
    </div>
  )
})
Input.displayName = 'Input'
