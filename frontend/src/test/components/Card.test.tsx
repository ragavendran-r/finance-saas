import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '../../components/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Card title="My Card"><p>Content</p></Card>)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('does not render header when neither title nor action provided', () => {
    const { container } = render(<Card><p>Content</p></Card>)
    // No h3 should appear
    expect(container.querySelector('h3')).not.toBeInTheDocument()
  })

  it('renders action when provided', () => {
    render(
      <Card action={<button>Action</button>}>
        Content
      </Card>
    )
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('renders both title and action', () => {
    render(
      <Card title="Title" action={<button>Act</button>}>
        Content
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument()
  })

  it('applies additional className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
