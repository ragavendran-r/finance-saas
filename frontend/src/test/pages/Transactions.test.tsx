import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Transactions from '../../pages/Transactions'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { mockTransaction } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

function renderTransactions() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Transactions />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Transactions page', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
    localStorage.setItem('access_token', 'valid-token')
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    localStorage.clear()
  })

  it('renders the Transactions heading', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /transactions/i })).toBeInTheDocument()
    })
  })

  it('renders Add Transaction button', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument()
    })
  })

  it('renders transaction description in table', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText('Grocery shopping')).toBeInTheDocument()
    })
  })

  it('renders transaction amount', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText('-$50.00')).toBeInTheDocument()
    })
  })

  it('renders search input', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search transactions/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions found', async () => {
    server.use(
      http.get(`${BASE}/transactions`, () => HttpResponse.json([]))
    )
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText(/no transactions found/i)).toBeInTheDocument()
    })
  })

  it('opens create modal when Add Transaction is clicked', async () => {
    const user = userEvent.setup()
    renderTransactions()
    await waitFor(() => screen.getByText('Grocery shopping'))
    await user.click(screen.getByRole('button', { name: /add transaction/i }))
    await waitFor(() => {
      // Modal form field - description input
      expect(screen.getByPlaceholderText(/what was this transaction for/i)).toBeInTheDocument()
    })
  })

  it('filters by search input (passes param to API)', async () => {
    let capturedUrl: string | undefined
    server.use(
      http.get(`${BASE}/transactions`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([])
      })
    )
    const user = userEvent.setup()
    renderTransactions()
    await waitFor(() => screen.getByPlaceholderText(/search transactions/i))
    const searchInput = screen.getByPlaceholderText(/search transactions/i)
    await user.type(searchInput, 'grocery')
    await waitFor(() => {
      expect(capturedUrl).toContain('search=grocery')
    })
  })

  it('renders the Date, Description, Amount columns', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
    })
  })

  it('shows page number in pagination', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText(/page 1/i)).toBeInTheDocument()
    })
  })
})
