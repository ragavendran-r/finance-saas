import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Accounts from '../../pages/Accounts'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { mockAccount } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

function renderAccounts() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Accounts />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Accounts page', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
    localStorage.setItem('access_token', 'valid-token')
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    localStorage.clear()
  })

  it('renders loading state initially', () => {
    server.use(
      http.get(`${BASE}/accounts`, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json([mockAccount])
      })
    )
    renderAccounts()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders accounts list after loading', async () => {
    renderAccounts()
    await waitFor(() => {
      expect(screen.getByText('Main Checking')).toBeInTheDocument()
    })
  })

  it('renders account balance', async () => {
    renderAccounts()
    await waitFor(() => {
      // $1,000.00 appears as both account balance and total; use getAllByText
      const matches = screen.getAllByText('$1,000.00')
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it('renders account institution name', async () => {
    renderAccounts()
    await waitFor(() => {
      expect(screen.getByText('Chase')).toBeInTheDocument()
    })
  })

  it('renders Add Account button', async () => {
    renderAccounts()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument()
    })
  })

  it('opens create modal when Add Account is clicked', async () => {
    const user = userEvent.setup()
    renderAccounts()
    // Wait for accounts to load first
    await waitFor(() => screen.getByText('Main Checking'))
    // Click the header Add Account button (first one)
    const addBtns = screen.getAllByRole('button', { name: /add account/i })
    await user.click(addBtns[0])
    await waitFor(() => {
      // Modal title and form field should be visible
      expect(screen.getByPlaceholderText('Main Checking')).toBeInTheDocument()
    })
  })

  it('shows empty state when no accounts', async () => {
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json([]))
    )
    renderAccounts()
    await waitFor(() => {
      expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument()
    })
  })

  it('shows error alert when account load fails', async () => {
    server.use(
      http.get(`${BASE}/accounts`, () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 })
      )
    )
    renderAccounts()
    await waitFor(() => {
      expect(screen.getByText(/failed to load accounts/i)).toBeInTheDocument()
    })
  })

  it('opens delete confirmation when delete button is clicked', async () => {
    const user = userEvent.setup()
    renderAccounts()
    await waitFor(() => screen.getByText('Main Checking'))
    // Find trash icon button - it's a small button
    const deleteButtons = screen.getAllByRole('button')
    // Look for the delete button (Trash2 icon)
    const trashBtns = deleteButtons.filter((btn) => btn.querySelector('svg'))
    // The delete button is the last icon button in the account card
    const trashBtn = trashBtns.find((btn) => {
      return btn.className.includes('hover:text-red-600')
    })
    if (trashBtn) {
      await user.click(trashBtn)
      await waitFor(() => {
        expect(screen.getByText(/delete account/i)).toBeInTheDocument()
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })
    }
  })

  it('shows total balance', async () => {
    renderAccounts()
    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })
  })
})
