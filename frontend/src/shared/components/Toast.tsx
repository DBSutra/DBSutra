/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { Icon } from '@primitives'
import './Toast.css'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${++counterRef.current}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
    if (duration > 0) setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  const success = useCallback((msg: string) => addToast('success', msg), [addToast])
  const error = useCallback((msg: string) => addToast('error', msg, 8000), [addToast])
  const warning = useCallback((msg: string) => addToast('warning', msg, 6000), [addToast])
  const info = useCallback((msg: string) => addToast('info', msg), [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />)}
        </div>
      )}
    </ToastContext.Provider>
  )
}

const iconMap: Record<ToastType, string> = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' }

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => (
  <div className={`toast-item toast-${toast.type}`} onClick={() => onRemove(toast.id)}>
    <Icon name={iconMap[toast.type]} size={16} className={`toast-icon-${toast.type}`} />
    <div className="toast-message">{toast.message}</div>
    <button className="toast-close" onClick={(e) => { e.stopPropagation(); onRemove(toast.id) }}>
      <Icon name="x" size={14} />
    </button>
  </div>
)
