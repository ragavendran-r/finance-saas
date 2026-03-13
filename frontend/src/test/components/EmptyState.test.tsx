import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../../components/EmptyState'

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No data" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="No data" description="Add some items to get started." />)
    expect(screen.getByText('Add some items to get started.')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<EmptyState title="No data" />)
    // No <p> other than title
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<EmptyState title="No data" icon={<span data-testid="my-icon">icon</span>} />)
    expect(screen.getByTestId('my-icon')).toBeInTheDocument()
  })

  it('renders action when provided', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        title="No data"
        action={<button onClick={handleClick}>Add Item</button>}
      />
    )
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument()
  })

  it('action button is clickable', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <EmptyState
        title="No data"
        action={<button onClick={handleClick}>Add Item</button>}
      />
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
