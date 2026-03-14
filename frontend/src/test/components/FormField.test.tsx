import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField, Input, Select, Textarea } from '../../components/FormField'

describe('FormField', () => {
  it('renders the label', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders required asterisk when required is true', () => {
    const { container } = render(
      <FormField label="Name" required>
        <input />
      </FormField>
    )
    expect(container.querySelector('.text-red-500')).toBeInTheDocument()
  })

  it('does not render asterisk when required is false', () => {
    const { container } = render(
      <FormField label="Name">
        <input />
      </FormField>
    )
    expect(container.querySelector('.text-red-500')).not.toBeInTheDocument()
  })

  it('renders error message', () => {
    render(
      <FormField label="Email" error="Invalid email">
        <input />
      </FormField>
    )
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('renders hint when no error', () => {
    render(
      <FormField label="Slug" hint="Lowercase only">
        <input />
      </FormField>
    )
    expect(screen.getByText('Lowercase only')).toBeInTheDocument()
  })

  it('does not render hint when error is present', () => {
    render(
      <FormField label="Slug" hint="Lowercase only" error="Required">
        <input />
      </FormField>
    )
    expect(screen.queryByText('Lowercase only')).not.toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <FormField label="Test">
        <input data-testid="my-input" />
      </FormField>
    )
    expect(screen.getByTestId('my-input')).toBeInTheDocument()
  })
})

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('applies error styling when error is true', () => {
    const { container } = render(<Input error />)
    expect(container.querySelector('input')?.className).toContain('border-red-300')
  })

  it('applies normal styling when error is false', () => {
    const { container } = render(<Input error={false} />)
    expect(container.querySelector('input')?.className).toContain('border-gray-200')
  })

  it('forwards additional props', () => {
    render(<Input type="email" placeholder="email" data-testid="email-input" />)
    const input = screen.getByTestId('email-input')
    expect(input).toHaveAttribute('type', 'email')
  })
})

describe('Select', () => {
  it('renders a select element with options', () => {
    render(
      <Select>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
  })

  it('applies error styling when error is true', () => {
    const { container } = render(<Select error><option>opt</option></Select>)
    expect(container.querySelector('select')?.className).toContain('border-red-300')
  })
})

describe('Textarea', () => {
  it('renders a textarea', () => {
    render(<Textarea placeholder="Notes..." />)
    expect(screen.getByPlaceholderText('Notes...')).toBeInTheDocument()
  })

  it('applies error styling when error is true', () => {
    const { container } = render(<Textarea error />)
    expect(container.querySelector('textarea')?.className).toContain('border-red-300')
  })
})
