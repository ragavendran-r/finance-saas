import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from '../../pages/Dashboard'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { setAccessToken } from '../../api/client'
import { http, HttpResponse } from 'msw'
import { mockNetWorth, mockIncomeVsExpenses } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Dashboard page', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    setAccessToken(null)
  })

  it('shows loading state initially', () => {
    // Override with slow responses to catch loading
    server.use(
      http.get(`${BASE}/reports/net-worth`, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json(mockNetWorth)
      })
    )
    renderDashboard()
    // LoadingSpinner should appear while all queries are loading
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders Net Worth after data loads', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Net Worth')).toBeInTheDocument()
    })
    // Total net worth formatted
    expect(screen.getByText('$6,000.00')).toBeInTheDocument()
  })

  it('renders Income This Month', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/income this month/i)).toBeInTheDocument()
    })
    expect(screen.getByText('$3,000.00')).toBeInTheDocument()
  })

  it('renders Expenses This Month', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/expenses this month/i)).toBeInTheDocument()
    })
    expect(screen.getByText('$1,500.00')).toBeInTheDocument()
  })

  it('renders Recent Transactions card', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
    })
  })

  it('renders Spending by Category card', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Spending by Category')).toBeInTheDocument()
    })
  })

  it('renders "No transactions yet" when no transactions', async () => {
    server.use(
      http.get(`${BASE}/transactions`, () => HttpResponse.json([]))
    )
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
    })
  })

  it('renders "No spending data" when no spending', async () => {
    server.use(
      http.get(`${BASE}/reports/spending-by-category`, () => HttpResponse.json([]))
    )
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/no spending data this month/i)).toBeInTheDocument()
    })
  })

  it('renders Dashboard heading', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })
  })
})
