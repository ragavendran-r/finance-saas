import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Users from '../../pages/Users'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { setAccessToken } from '../../api/client'
import { http, HttpResponse } from 'msw'
import { mockUser } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

function renderUsers(role: 'admin' | 'member' = 'admin') {
  // Override the /auth/me to return specified role
  server.use(
    http.get(`${BASE}/auth/me`, () =>
      HttpResponse.json({ ...mockUser, role })
    )
  )

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Users />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Users page', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })

  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    setAccessToken(null)
  })

  it('shows "Admin Access Required" for non-admin users', async () => {
    renderUsers('member')
    await waitFor(() => {
      expect(screen.getByText(/admin access required/i)).toBeInTheDocument()
    })
  })

  it('renders Users heading for admin', async () => {
    renderUsers('admin')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument()
    })
  })

  it('renders user name in table for admin', async () => {
    renderUsers('admin')
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('renders user email in table', async () => {
    renderUsers('admin')
    await waitFor(() => {
      // email appears in both the table cell (hidden on mobile) and mobile fallback
      const emailEls = screen.getAllByText('test@example.com')
      expect(emailEls.length).toBeGreaterThan(0)
    })
  })

  it('renders Admin badge for admin users', async () => {
    renderUsers('admin')
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })
  })

  it('shows error alert when users fail to load', async () => {
    server.use(
      http.get(`${BASE}/users`, () =>
        HttpResponse.json({ detail: 'Error' }, { status: 500 })
      )
    )
    renderUsers('admin')
    await waitFor(() => {
      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no users', async () => {
    server.use(
      http.get(`${BASE}/users`, () => HttpResponse.json([]))
    )
    renderUsers('admin')
    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument()
    })
  })

  it('shows Active badge for active users', async () => {
    renderUsers('admin')
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('marks current user with "(you)"', async () => {
    renderUsers('admin')
    await waitFor(() => {
      expect(screen.getByText('(you)')).toBeInTheDocument()
    })
  })
})
