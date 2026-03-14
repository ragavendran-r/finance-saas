import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../../hooks/useAuth'
import { setAccessToken } from '../../api/client'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { mockUser } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

function TestComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-email">{user?.email ?? 'none'}</span>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    )
  }
}

describe('useAuth', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    setAccessToken(null)
  })

  it('throws when used outside AuthProvider', () => {
    const originalError = console.error
    console.error = () => {}
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within AuthProvider')
    console.error = originalError
  })

  it('starts unauthenticated when refresh cookie is absent/invalid', async () => {
    // Override refresh to simulate no valid cookie
    server.use(
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )
    render(<TestComponent />, { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('authenticated').textContent).toBe('false')
    expect(screen.getByTestId('user-email').textContent).toBe('none')
  })

  it('fetches user when refresh cookie is valid', async () => {
    // Default handler returns a valid token and /auth/me returns mockUser
    render(<TestComponent />, { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe(mockUser.email)
    })

    expect(screen.getByTestId('authenticated').textContent).toBe('true')
  })

  it('login sets token in memory and fetches user', async () => {
    // Start unauthenticated
    server.use(
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )
    const user = userEvent.setup()
    render(<TestComponent />, { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe(mockUser.email)
    })

    expect(screen.getByTestId('authenticated').textContent).toBe('true')
  })

  it('logout clears token and user', async () => {
    const user = userEvent.setup()
    render(<TestComponent />, { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe(mockUser.email)
    })

    await user.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
    })

    expect(screen.getByTestId('user-email').textContent).toBe('none')
  })

  it('clears token when /auth/me fails', async () => {
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )

    render(<TestComponent />, { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('authenticated').textContent).toBe('false')
  })
})
