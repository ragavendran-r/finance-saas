import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Budgets from '../../pages/Budgets'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { setAccessToken } from '../../api/client'
import { http, HttpResponse } from 'msw'
import { mockBudgetProgress } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

function renderBudgets() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Budgets />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Budgets page', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    setAccessToken(null)
  })

  it('renders the Budgets heading', async () => {
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /budgets/i })).toBeInTheDocument()
    })
  })

  it('renders Add Budget button', async () => {
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add budget/i })).toBeInTheDocument()
    })
  })

  it('renders budget category name', async () => {
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    })
  })

  it('renders budget progress - spent amount', async () => {
    renderBudgets()
    await waitFor(() => {
      // "$200.00 spent"
      expect(screen.getByText(/\$200\.00 spent/i)).toBeInTheDocument()
    })
  })

  it('renders budget progress - remaining amount', async () => {
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText(/\$300\.00 remaining/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no budgets', async () => {
    server.use(
      http.get(`${BASE}/budgets`, () => HttpResponse.json([]))
    )
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText(/no budgets yet/i)).toBeInTheDocument()
    })
  })

  it('shows error alert when budgets fail to load', async () => {
    server.use(
      http.get(`${BASE}/budgets`, () =>
        HttpResponse.json({ detail: 'Error' }, { status: 500 })
      )
    )
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText(/failed to load budgets/i)).toBeInTheDocument()
    })
  })

  it('opens create modal when Add Budget is clicked', async () => {
    const user = userEvent.setup()
    renderBudgets()
    await waitFor(() => screen.getByText('Food & Dining'))
    const addBtns = screen.getAllByRole('button', { name: /add budget/i })
    await user.click(addBtns[0])
    await waitFor(() => {
      // Modal should show - look for "Create Budget" submit button
      expect(screen.getByRole('button', { name: /create budget/i })).toBeInTheDocument()
    })
  })

  it('renders "Over budget!" badge when percent > 100', async () => {
    server.use(
      http.get(`${BASE}/budgets/budget-1/progress`, () =>
        HttpResponse.json({
          ...mockBudgetProgress,
          percent_used: 120,
          spent: 600,
          remaining: -100,
        })
      )
    )
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText(/over budget!/i)).toBeInTheDocument()
    })
  })

  it('renders period badge', async () => {
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText('MONTHLY')).toBeInTheDocument()
    })
  })
})
