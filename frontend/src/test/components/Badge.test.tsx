import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../../components/Badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders with default gray variant', () => {
    const { container } = render(<Badge>Default</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-gray-100')
    expect(span?.className).toContain('text-gray-700')
  })

  it('renders green variant', () => {
    const { container } = render(<Badge variant="green">Active</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-green-100')
    expect(span?.className).toContain('text-green-800')
  })

  it('renders red variant', () => {
    const { container } = render(<Badge variant="red">Error</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-red-100')
    expect(span?.className).toContain('text-red-800')
  })

  it('renders blue variant', () => {
    const { container } = render(<Badge variant="blue">Info</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-blue-100')
    expect(span?.className).toContain('text-blue-800')
  })

  it('renders yellow variant', () => {
    const { container } = render(<Badge variant="yellow">Warning</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-yellow-100')
    expect(span?.className).toContain('text-yellow-800')
  })

  it('renders purple variant', () => {
    const { container } = render(<Badge variant="purple">Admin</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-purple-100')
    expect(span?.className).toContain('text-purple-800')
  })

  it('renders as a span element', () => {
    const { container } = render(<Badge>Test</Badge>)
    expect(container.querySelector('span')).toBeInTheDocument()
  })
})
