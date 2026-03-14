import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Register from '../../pages/Register'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:8000/api/v1'

function renderRegister() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Register page', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  it('renders Full Name field', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('Jane Smith')).toBeInTheDocument()
  })

  it('renders Email field', () => {
    renderRegister()
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument()
  })

  it('renders Password field', () => {
    renderRegister()
    expect(screen.getByPlaceholderText(/min 8 characters/i)).toBeInTheDocument()
  })

  it('renders Organization Name field', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('Acme Corp')).toBeInTheDocument()
  })

  it('renders Workspace Slug field', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('acme-corp')).toBeInTheDocument()
  })

  it('renders Create Account button', () => {
    renderRegister()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders link to login page', () => {
    renderRegister()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/full name required/i)).toBeInTheDocument()
    })
  })

  it('redirects to /login on successful registration', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByPlaceholderText('Jane Smith'), 'Jane Smith')
    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'jane@example.com')
    await user.type(screen.getByPlaceholderText(/min 8 characters/i), 'password123')
    await user.type(screen.getByPlaceholderText('Acme Corp'), 'Acme Corp')
    await user.type(screen.getByPlaceholderText('acme-corp'), 'acme-corp')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })

  it('shows server error on registration failure', async () => {
    server.use(
      http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json({ detail: 'Email already registered' }, { status: 409 })
      )
    )

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByPlaceholderText('Jane Smith'), 'Jane Smith')
    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'jane@example.com')
    await user.type(screen.getByPlaceholderText(/min 8 characters/i), 'password123')
    await user.type(screen.getByPlaceholderText('Acme Corp'), 'Acme Corp')
    await user.type(screen.getByPlaceholderText('acme-corp'), 'acme-corp')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
  })

  it('shows generic error when no detail provided', async () => {
    server.use(
      http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json({}, { status: 500 })
      )
    )

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByPlaceholderText('Jane Smith'), 'Jane Smith')
    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'jane@example.com')
    await user.type(screen.getByPlaceholderText(/min 8 characters/i), 'password123')
    await user.type(screen.getByPlaceholderText('Acme Corp'), 'Acme Corp')
    await user.type(screen.getByPlaceholderText('acme-corp'), 'acme-corp')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
    })
  })
})
