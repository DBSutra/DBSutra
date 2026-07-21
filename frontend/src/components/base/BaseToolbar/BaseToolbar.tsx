/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import './BaseToolbar.css'

export interface BaseToolbarProps {
  left?: React.ReactNode
  right?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export const BaseToolbar: React.FC<BaseToolbarProps> = ({
  left,
  right,
  children,
  className = '',
}) => {
  if (children) {
    return (
      <div className={`base-toolbar ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`base-toolbar ${className}`}>
      <div className="base-toolbar-left">{left}</div>
      {right && <div className="base-toolbar-right">{right}</div>}
    </div>
  )
}
