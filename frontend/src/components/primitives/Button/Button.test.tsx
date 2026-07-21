/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

// Mock CSS import
vi.mock('./Button.css', () => ({}))

// Mock Icon component — it renders a simple span for testing
vi.mock('../Icon', () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}))

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>)

    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument()
  })

  it('fires onClick handler when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<Button onClick={onClick}>Press</Button>)

    await user.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<Button disabled onClick={onClick}>Disabled</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when loading', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<Button loading onClick={onClick}>Loading</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders loading spinner icon when loading', () => {
    render(<Button loading>Loading</Button>)

    expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
  })

  it('renders left icon when specified', () => {
    render(<Button icon="plus">Add</Button>)

    expect(screen.getByTestId('icon-plus')).toBeInTheDocument()
  })

  it('renders right icon when specified', () => {
    render(<Button iconRight="chevron-right">Next</Button>)

    expect(screen.getByTestId('icon-chevron-right')).toBeInTheDocument()
  })

  it('applies variant class', () => {
    render(<Button variant="primary">Primary</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('btn-primary')
  })

  it('applies size class', () => {
    render(<Button size="lg">Large</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('btn-lg')
  })

  it('defaults to secondary variant and md size', () => {
    render(<Button>Default</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('btn-secondary')
    expect(button.className).toContain('btn-md')
  })

  it('applies block class when block prop is true', () => {
    render(<Button block>Full Width</Button>)

    expect(screen.getByRole('button').className).toContain('btn-block')
  })

  it('applies additional className', () => {
    render(<Button className="custom-class">Styled</Button>)

    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('applies btn-icon-only class when no children', () => {
    render(<Button icon="plus" />)

    expect(screen.getByRole('button').className).toContain('btn-icon-only')
  })

  it('does not render right icon when loading', () => {
    render(<Button iconRight="chevron-right" loading>Loading</Button>)

    expect(screen.queryByTestId('icon-chevron-right')).not.toBeInTheDocument()
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
  })

  describe('danger variant', () => {
    it('applies btn-danger class', () => {
      render(<Button variant="danger">Delete</Button>)

      expect(screen.getByRole('button').className).toContain('btn-danger')
    })
  })

  describe('ghost variant', () => {
    it('applies btn-ghost class', () => {
      render(<Button variant="ghost">Ghost</Button>)

      expect(screen.getByRole('button').className).toContain('btn-ghost')
    })
  })
})
