/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders a status dot', () => {
    const { container } = render(<StatusBadge status="connected" />)

    const dot = container.querySelector('.status-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('status-connected')
  })

  it('applies the correct status class for each status type', () => {
    const statuses = ['connected', 'disconnected', 'connecting', 'error'] as const

    for (const status of statuses) {
      const { container, unmount } = render(<StatusBadge status={status} />)
      const dot = container.querySelector('.status-dot')!
      expect(dot).toHaveClass(`status-${status}`)
      unmount()
    }
  })

  it('renders a label when provided', () => {
    render(<StatusBadge status="connected" label="My DB" />)

    expect(screen.getByText('My DB')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    const { container } = render(<StatusBadge status="connected" />)

    expect(container.querySelector('.status-label')).not.toBeInTheDocument()
  })

  it('applies custom size to the dot', () => {
    const { container } = render(<StatusBadge status="connected" size={16} />)

    const dot = container.querySelector('.status-dot') as HTMLElement
    expect(dot.style.width).toBe('16px')
    expect(dot.style.height).toBe('16px')
  })

  it('defaults size to 8', () => {
    const { container } = render(<StatusBadge status="connected" />)

    const dot = container.querySelector('.status-dot') as HTMLElement
    expect(dot.style.width).toBe('8px')
    expect(dot.style.height).toBe('8px')
  })

  it('renders the wrapper with status-badge class', () => {
    const { container } = render(<StatusBadge status="connected" />)

    expect(container.querySelector('.status-badge')).toBeInTheDocument()
  })

  describe('with error status', () => {
    it('shows error styling', () => {
      render(<StatusBadge status="error" label="Connection failed" />)

      expect(screen.getByText('Connection failed')).toBeInTheDocument()
      const dot = document.querySelector('.status-dot')!
      expect(dot).toHaveClass('status-error')
    })
  })

  describe('with connecting status', () => {
    it('shows connecting styling', () => {
      const { container } = render(<StatusBadge status="connecting" label="Connecting..." />)

      expect(screen.getByText('Connecting...')).toBeInTheDocument()
      expect(container.querySelector('.status-dot')).toHaveClass('status-connecting')
    })
  })
})
