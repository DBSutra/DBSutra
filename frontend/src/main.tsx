/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary, ToastProvider } from '@shared/components'
import App from './app/App'
import './index.css'

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLERS — catch everything that escapes React's error boundary
// ══════════════════════════════════════════════════════════════════════════════

window.addEventListener('unhandledrejection', (event) => {
  console.error('[GLOBAL] Unhandled Promise Rejection:', {
    reason: event.reason,
    message: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack,
    timestamp: new Date().toISOString(),
  })
  // Prevent the default behavior (console error + potential crash)
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  console.error('[GLOBAL] Uncaught Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack ?? event.error,
    timestamp: new Date().toISOString(),
  })
})

// Log frontend startup
console.info('[main] DBSutra frontend starting...', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  timestamp: new Date().toISOString(),
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary module="AppRoot">
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
