/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

// Mock CSS import
vi.mock('./Input.css', () => ({}))

// Mock Icon component
vi.mock('../Icon', () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}))

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with placeholder text', () => {
    render(<Input placeholder="Enter value..." />)

    expect(screen.getByPlaceholderText('Enter value...')).toBeInTheDocument()
  })

  it('fires onChange when value changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Input onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'hello')

    // onChange fires once per character
    expect(onChange).toHaveBeenCalledTimes(5)
  })

  it('is disabled when disabled prop is set', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Input disabled onChange={onChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('renders an icon when icon prop is provided', () => {
    render(<Input icon="search" />)

    expect(screen.getByTestId('icon-search')).toBeInTheDocument()
  })

  it('does not render an icon when icon prop is absent', () => {
    render(<Input />)

    expect(screen.queryByTestId(/icon-/)).not.toBeInTheDocument()
  })

  it('applies with-icon class when icon is present', () => {
    render(<Input icon="search" />)

    const input = screen.getByRole('textbox')
    expect(input.className).toContain('with-icon')
  })

  it('does not apply with-icon class when no icon', () => {
    render(<Input />)

    const input = screen.getByRole('textbox')
    expect(input.className).not.toContain('with-icon')
  })

  it('forwards the ref', () => {
    const ref = { current: null as HTMLInputElement | null }

    render(<Input ref={(el) => { ref.current = el }} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('applies additional className to the wrapper', () => {
    render(<Input className="my-class" />)

    const wrapper = screen.getByRole('textbox').parentElement!
    expect(wrapper.className).toContain('my-class')
  })

  it('passes through HTML input attributes', () => {
    render(<Input type="password" maxLength={20} autoComplete="off" />)

    // type="password" has no ARIA textbox role; use querySelector instead
    const passwordInput = document.querySelector('input[type="password"]')
    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('maxlength', '20')
    expect(passwordInput).toHaveAttribute('autocomplete', 'off')
  })

  it('supports controlled value', () => {
    const { rerender } = render(<Input value="initial" onChange={() => {}} />)

    expect(screen.getByRole('textbox')).toHaveValue('initial')

    rerender(<Input value="updated" onChange={() => {}} />)

    expect(screen.getByRole('textbox')).toHaveValue('updated')
  })

  it('renders with defaultValue', () => {
    render(<Input defaultValue="default text" />)

    expect(screen.getByRole('textbox')).toHaveValue('default text')
  })
})
