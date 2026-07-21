/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { ICON_MAP } from './iconMap'

export interface IconProps {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent) => void
}

/** Renders a Lucide icon by name. Falls back to a circle if not found. */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  className = '',
  strokeWidth = 1.8,
  style,
  onClick,
}) => {
  const IconComponent = ICON_MAP[name]
  if (!IconComponent) {
    if (import.meta.env.DEV) console.warn(`[Icon] Unknown icon: "${name}"`)
    return <span className={className} style={style} />
  }
  return <IconComponent size={size} className={`icon ${className}`} strokeWidth={strokeWidth} style={style} onClick={onClick} />
}
