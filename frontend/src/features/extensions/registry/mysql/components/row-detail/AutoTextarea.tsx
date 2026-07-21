/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useRef, useEffect, useCallback } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
}

export const AutoTextarea: React.FC<Props> = ({ value, onChange, placeholder, readOnly, className }) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(Math.max(el.scrollHeight, 28), 200) + 'px'
  }, [])

  useEffect(() => { resize() }, [value, resize])

  return (
    <textarea ref={ref} className={className} value={value} onChange={(e) => { onChange(e.target.value); resize() }} placeholder={placeholder} readOnly={readOnly} rows={1} onFocus={resize} />
  )
}
