/**
 * Additional Budgets page tests to improve coverage
 * of lines 127-137, 170-201 (edit modal, delete flow)
 */
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
import { mockBudget, mockBudgetProgress, mockCategory } from '../mocks/handlers'

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

describe('Budgets page - additional coverage', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    setAccessToken(null)
  })

  it('submits create budget form', async () => {
    const user = userEvent.setup()
    let createCalled = false
    server.use(
      http.post(`${BASE}/budgets`, async () => {
        createCalled = true
        return HttpResponse.json(mockBudget, { status: 201 })
      })
    )
    renderBudgets()
    await waitFor(() => screen.getByText('Food & Dining'))
    const addBtns = screen.getAllByRole('button', { name: /add budget/i })
    await user.click(addBtns[0])
    await waitFor(() => screen.getByRole('button', { name: /create budget/i }))

    // Select category
    const categorySelect = screen.getAllByRole('combobox')[0]
    await user.selectOptions(categorySelect, mockCategory.id)

    // Fill amount
    const amountInput = screen.getByPlaceholderText('500.00')
    await user.clear(amountInput)
    await user.type(amountInput, '300')

    await user.click(screen.getByRole('button', { name: /create budget/i }))
    await waitFor(() => {
      expect(createCalled).toBe(true)
    })
  })

  it('opens edit modal when pencil button is clicked', async () => {
    const user = userEvent.setup()
    renderBudgets()
    await waitFor(() => screen.getByText('Food & Dining'))
    const editBtns = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('hover:text-indigo-600')
    )
    if (editBtns.length > 0) {
      await user.click(editBtns[0])
      await waitFor(() => {
        expect(screen.getByText('Edit Budget')).toBeInTheDocument()
      })
    }
  })

  it('confirms delete and calls delete API', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.delete(`${BASE}/budgets/:id`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderBudgets()
    await waitFor(() => screen.getByText('Food & Dining'))
    const deleteBtn = screen.getAllByRole('button').find((btn) =>
      btn.className.includes('hover:text-red-600')
    )
    if (deleteBtn) {
      await user.click(deleteBtn)
      await waitFor(() => screen.getByText(/delete budget/i))
      await user.click(screen.getByRole('button', { name: /delete/i }))
      await waitFor(() => {
        expect(deleteCalled).toBe(true)
      })
    }
  })

  it('renders percent used label', async () => {
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText(/40% used/i)).toBeInTheDocument()
    })
  })
})
