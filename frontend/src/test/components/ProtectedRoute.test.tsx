import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:8000/api/v1'

function renderProtectedRoute(
  initialEntry: string,
  overrideHandlers?: Parameters<typeof server['use']>
) {
  if (overrideHandlers) server.use(...overrideHandlers)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <p>Protected Dashboard</p>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<p>Login page</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    localStorage.clear()
  })

  it('shows loading spinner initially when token exists', async () => {
    localStorage.setItem('access_token', 'test-token')
    // Use a slow response so we can catch loading state
    server.use(
      http.get(`${BASE}/auth/me`, async () => {
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({
          id: 'user-1',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'admin',
          is_active: true,
          tenant_id: 't1',
          created_at: '2024-01-01T00:00:00Z',
        })
      })
    )
    renderProtectedRoute('/dashboard')
    // Loading spinner should show during the auth check
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects to /login when no token in localStorage', async () => {
    localStorage.removeItem('access_token')
    renderProtectedRoute('/dashboard')

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })

  it('renders children when authenticated', async () => {
    localStorage.setItem('access_token', 'valid-token')
    renderProtectedRoute('/dashboard')

    await waitFor(() => {
      expect(screen.getByText('Protected Dashboard')).toBeInTheDocument()
    })
  })

  it('redirects to /login when auth/me returns 401', async () => {
    localStorage.setItem('access_token', 'bad-token')
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )
    renderProtectedRoute('/dashboard')

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })
})
