/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'

export interface CategoryGroupProps {
  label: string
  count: number
  children: React.ReactNode
  className?: string
  headerClassName?: string
  labelClassName?: string
  countClassName?: string
}

export const CategoryGroup: React.FC<CategoryGroupProps> = ({
  label,
  count,
  children,
  className = '',
  headerClassName = '',
  labelClassName = '',
  countClassName = '',
}) => {
  return (
    <div className={className}>
      <div className={headerClassName}>
        <span className={labelClassName}>{label}</span>
        <span className={countClassName}>{count}</span>
      </div>
      {children}
    </div>
  )
}
