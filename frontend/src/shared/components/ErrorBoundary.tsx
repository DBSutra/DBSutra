/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Icon } from '@primitives'
import { logError } from '../utils/errors'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  module?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Production-grade React Error Boundary.
 * Catches rendering errors, logs them with context, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    logError(error, {
      module: this.props.module ?? 'ErrorBoundary',
      operation: 'render',
      severity: 'high',
      details: { componentStack: errorInfo.componentStack },
    })
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleCopyError = () => {
    const { error, errorInfo } = this.state
    const text = [
      `Error: ${error?.message}`,
      '',
      'Component Stack:',
      errorInfo?.componentStack,
      '',
      'Stack Trace:',
      error?.stack,
    ].join('\n')

    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="error-boundary">
          <div className="error-boundary-icon-wrap">
            <Icon name="warning" size={24} style={{ color: 'var(--color-error)' }} />
          </div>
          <div className="error-boundary-title">Something went wrong</div>
          <div className="error-boundary-message">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </div>
          {import.meta.env.DEV && this.state.errorInfo && (
            <details className="error-boundary-details">
              <summary>Technical Details</summary>
              <pre>
                {this.state.error?.stack}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div className="error-boundary-actions">
            <button className="error-boundary-btn error-boundary-btn-primary" onClick={this.handleRetry}>
              <Icon name="refresh" size={14} />Try Again
            </button>
            {import.meta.env.DEV && (
              <button className="error-boundary-btn error-boundary-btn-secondary" onClick={this.handleCopyError}>
                <Icon name="copy" size={14} />Copy Error
              </button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
