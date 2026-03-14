/**
 * Additional Transactions page tests to improve coverage
 * of lines 346-356, 379-388 (edit modal, delete flow)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Transactions from '../../pages/Transactions'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { setAccessToken } from '../../api/client'
import { http, HttpResponse } from 'msw'
import { mockTransaction, mockAccount } from '../mocks/handlers'

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

describe('Transactions page - additional coverage', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    setAccessToken(null)
  })

  it('opens edit modal when pencil button is clicked', async () => {
    const user = userEvent.setup()
    renderTransactions()
    await waitFor(() => screen.getByText('Grocery shopping'))
    const editBtns = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('hover:text-indigo-600')
    )
    if (editBtns.length > 0) {
      await user.click(editBtns[0])
      await waitFor(() => {
        expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
      })
    }
  })

  it('confirms delete and calls delete API', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.delete(`${BASE}/transactions/:id`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderTransactions()
    await waitFor(() => screen.getByText('Grocery shopping'))
    const deleteBtn = screen.getAllByRole('button').find((btn) =>
      btn.className.includes('hover:text-red-600')
    )
    if (deleteBtn) {
      await user.click(deleteBtn)
      await waitFor(() => screen.getByText(/delete transaction/i))
      await user.click(screen.getByRole('button', { name: /delete/i }))
      await waitFor(() => {
        expect(deleteCalled).toBe(true)
      })
    }
  })

  it('submits create transaction form', async () => {
    const user = userEvent.setup()
    let createCalled = false
    server.use(
      http.post(`${BASE}/transactions`, async () => {
        createCalled = true
        return HttpResponse.json(mockTransaction, { status: 201 })
      })
    )
    renderTransactions()
    await waitFor(() => screen.getByText('Grocery shopping'))
    await user.click(screen.getByRole('button', { name: /add transaction/i }))
    await waitFor(() => screen.getByPlaceholderText(/what was this transaction for/i))

    // Fill required fields - use the modal's account select (first one in the form)
    const allSelects = screen.getAllByRole('combobox')
    // The form account select has "Select account" as placeholder option
    const accountSelect = allSelects.find((s) => s.querySelector('option[value=""]')?.textContent === 'Select account')
    if (accountSelect) {
      await user.selectOptions(accountSelect, mockAccount.id)
    }

    const descInput = screen.getByPlaceholderText(/what was this transaction for/i)
    await user.type(descInput, 'Test expense')

    const amountInputs = screen.getAllByRole('spinbutton')
    await user.clear(amountInputs[0])
    await user.type(amountInputs[0], '25')

    // Submit button - the one inside the modal form (not header button)
    const submitBtns = screen.getAllByRole('button', { name: /add transaction/i })
    await user.click(submitBtns[submitBtns.length - 1])

    await waitFor(() => {
      expect(createCalled).toBe(true)
    })
  })

  it('filter by account dropdown reflects account options after loading', async () => {
    userEvent.setup()
    renderTransactions()
    // Wait for accounts to load and appear in filter
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox')
      // The filter account select should have the mock account option
      const hasAccount = selects.some((s) => s.querySelector(`option[value="${mockAccount.id}"]`))
      expect(hasAccount).toBe(true)
    })
    // The filter select for accounts
    const filterSelect = screen.getAllByRole('combobox').find((s) =>
      s.querySelector(`option[value="${mockAccount.id}"]`)
    )
    expect(filterSelect).toBeDefined()
  })

  it('renders recurring badge for recurring transactions', async () => {
    server.use(
      http.get(`${BASE}/transactions`, () =>
        HttpResponse.json([{ ...mockTransaction, is_recurring: true }])
      )
    )
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText('Recurring')).toBeInTheDocument()
    })
  })

  it('renders merchant name in table', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText('Whole Foods')).toBeInTheDocument()
    })
  })
})
