/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { Icon } from '@primitives'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  iconClassName?: string
  inputClassName?: string
  clearClassName?: string
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  iconClassName = '',
  inputClassName = '',
  clearClassName = '',
}) => {
  return (
    <div className={className}>
      <Icon name="search" size={14} className={iconClassName} />
      <input
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className={clearClassName} onClick={() => onChange('')}>
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  )
}
