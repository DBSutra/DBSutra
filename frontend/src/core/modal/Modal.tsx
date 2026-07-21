/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Modal width: 'sm' (360px), 'md' (540px), 'lg' (720px), 'full' (90vw) */
  size?: 'sm' | 'md' | 'lg' | 'full'
  /** Vertical alignment: 'center' or 'top' (with offset) */
  align?: 'center' | 'top'
  /** Custom top offset when align='top' */
  topOffset?: string
  /** Additional class name on the modal content */
  className?: string
  /** Whether clicking the overlay closes the modal */
  closeOnOverlayClick?: boolean
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean
}

const SIZES: Record<string, string> = {
  sm: '400px',
  md: '560px',
  lg: '720px',
  full: '90vw',
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  size = 'md',
  align = 'center',
  topOffset,
  className = '',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open || !closeOnEscape) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, closeOnEscape, onClose])

  // Focus the modal content on open
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus()
    }
  }, [open])

  if (!open) return null

  const overlayStyle: React.CSSProperties = align === 'top' && topOffset
    ? { alignItems: 'flex-start', paddingTop: topOffset }
    : {}

  const contentStyle: React.CSSProperties = {
    maxWidth: SIZES[size] || SIZES.md,
    width: size === 'full' ? '90vw' : undefined,
  }

  return createPortal(
    <div
      className="modal-overlay"
      style={overlayStyle}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        ref={contentRef}
        className={`modal-content ${className}`}
        style={contentStyle}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
