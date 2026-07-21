/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'

/** Returns the brand color for a database type. */
export function getDbColor(type: string): string {
  switch (type) {
    case 'mysql': return 'var(--color-db-mysql, #e48e00)'
    case 'postgres': return 'var(--color-db-postgres, #336791)'
    case 'mongodb': return 'var(--color-db-mongo, #4db33d)'
    case 'sqlite': return '#003b57'
    case 'redis': return '#dc382d'
    case 'elasticsearch': return '#005571'
    default: return 'var(--color-text-muted)'
  }
}

/** Returns the SVG path for a database type logo. */
function getDbSvg(type: string): string | null {
  switch (type) {
    case 'mysql':
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'
    case 'postgres':
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z'
    case 'mongodb':
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z'
    default:
      return null
  }
}

interface DbIconProps {
  type: string
  size?: number
  className?: string
}

/** Renders a database brand icon with its brand color. */
export const DbIcon: React.FC<DbIconProps> = ({ type, size = 16, className = '' }) => {
  const color = getDbColor(type)
  const svgPath = getDbSvg(type)

  if (svgPath) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} style={{ flexShrink: 0 }}>
        <path d={svgPath} />
      </svg>
    )
  }

  // Fallback: colored circle with first letter
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: size * 0.5,
        fontWeight: 700,
        flexShrink: 0,
        textTransform: 'uppercase',
      }}
    >
      {type.charAt(0)}
    </div>
  )
}
