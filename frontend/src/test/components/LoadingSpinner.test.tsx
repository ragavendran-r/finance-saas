import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../../components/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders default message "Loading..."', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders custom message', () => {
    render(<LoadingSpinner message="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('renders in full-page mode', () => {
    const { container } = render(<LoadingSpinner fullPage />)
    // min-h-screen class indicates full page
    expect(container.firstChild).toHaveClass('min-h-screen')
  })

  it('renders inline mode (no min-h-screen) without fullPage prop', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild).not.toHaveClass('min-h-screen')
  })

  it('renders an animated spinner icon', () => {
    const { container } = render(<LoadingSpinner />)
    // Loader2 renders as SVG with animate-spin class
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    // SVG className is an SVGAnimatedString; use getAttribute or classList
    expect(svg?.classList.contains('animate-spin')).toBe(true)
  })
})
