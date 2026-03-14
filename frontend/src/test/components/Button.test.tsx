import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../components/Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled and shows spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    // Loader2 icon is rendered (svg inside button)
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>)
    const btn = container.querySelector('button')
    expect(btn?.className).toContain('bg-indigo-600')
  })

  it('renders secondary variant', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>)
    const btn = container.querySelector('button')
    expect(btn?.className).toContain('bg-white')
    expect(btn?.className).toContain('text-gray-700')
  })

  it('renders danger variant', () => {
    const { container } = render(<Button variant="danger">Delete</Button>)
    const btn = container.querySelector('button')
    expect(btn?.className).toContain('bg-red-600')
  })

  it('renders ghost variant', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    const btn = container.querySelector('button')
    expect(btn?.className).toContain('text-gray-600')
  })

  it('renders small size', () => {
    const { container } = render(<Button size="sm">Small</Button>)
    const btn = container.querySelector('button')
    expect(btn?.className).toContain('px-3')
  })

  it('renders large size', () => {
    const { container } = render(<Button size="lg">Large</Button>)
    const btn = container.querySelector('button')
    expect(btn?.className).toContain('px-6')
  })

  it('renders leftIcon when not loading', () => {
    render(<Button leftIcon={<span data-testid="icon">icon</span>}>With Icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not render leftIcon when loading (shows spinner instead)', () => {
    render(<Button isLoading leftIcon={<span data-testid="icon">icon</span>}>Loading</Button>)
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('applies additional className', () => {
    const { container } = render(<Button className="w-full">Full Width</Button>)
    expect(container.querySelector('button')?.className).toContain('w-full')
  })
})
