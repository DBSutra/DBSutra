/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../Icon'
import './Dropdown.css'

export interface DropdownOption {
  value: string
  label: string
}

export interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export const Dropdown: React.FC<DropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const selectedOption = options.find(o => o.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      
      const minHeightRequired = 150
      
      if (spaceBelow < minHeightRequired && spaceAbove > spaceBelow) {
        // Drop UP
        setMenuStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          minWidth: Math.max(60, rect.width),
          maxHeight: `${Math.max(100, spaceAbove - 20)}px`
        })
      } else {
        // Drop DOWN
        setMenuStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          minWidth: Math.max(60, rect.width),
          maxHeight: `${Math.max(100, spaceBelow - 20)}px`
        })
      }
    }
  }, [isOpen])

  return (
    <div className={`ui-dropdown ${className}`} ref={dropdownRef}>
      <div 
        className={`ui-dropdown-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="ui-dropdown-name">{displayLabel}</span>
        <Icon name="chevron-down" size={14} className="ui-dropdown-chevron" />
      </div>

      {isOpen && createPortal(
        <div className="ui-dropdown-menu" style={menuStyle} ref={menuRef}>
          {options.map(opt => (
            <div 
              key={opt.value} 
              className={`ui-dropdown-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
            >
              <span className="ui-dropdown-name">{opt.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
