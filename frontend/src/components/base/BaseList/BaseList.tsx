/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { BaseEmpty, type BaseEmptyProps } from '../BaseEmpty'
import './BaseList.css'

export interface BaseListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  emptyProps?: BaseEmptyProps
  toolbar?: React.ReactNode
  className?: string
  listClassName?: string
}

export function BaseList<T>({
  items,
  renderItem,
  emptyProps,
  toolbar,
  className = '',
  listClassName = '',
}: BaseListProps<T>) {
  return (
    <div className={`base-list ${className}`}>
      {toolbar}
      {items.length === 0 && emptyProps ? (
        <BaseEmpty {...emptyProps} />
      ) : (
        <div className={`base-list-items ${listClassName}`}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      )}
    </div>
  )
}
