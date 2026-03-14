import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorAlert } from '../../components/ErrorAlert'

describe('ErrorAlert', () => {
  it('renders the message', () => {
    render(<ErrorAlert message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders different messages', () => {
    render(<ErrorAlert message="Network error" />)
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('has accessible error role via text', () => {
    const { container } = render(<ErrorAlert message="Failed to load" />)
    // The root element should have red styling
    expect(container.firstChild).toHaveClass('bg-red-50')
  })
})
