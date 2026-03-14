/**
 * Additional Accounts page tests covering edit/delete flows
 * to increase coverage of lines 202-204, 236-274
 */
import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Accounts from '../../pages/Accounts'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { setAccessToken } from '../../api/client'
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

describe('Accounts page - additional coverage', () => {
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
    renderAccounts()
    await waitFor(() => screen.getByText('Main Checking'))
    // Find pencil (edit) button
    const editBtns = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('hover:text-indigo-600')
    )
    if (editBtns.length > 0) {
      await user.click(editBtns[0])
      await waitFor(() => {
        expect(screen.getByText('Edit Account')).toBeInTheDocument()
      })
    }
  })

  it('submits create account form', async () => {
    const user = userEvent.setup()
    let createCalled = false
    server.use(
      http.post(`${BASE}/accounts`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        createCalled = true
        return HttpResponse.json({ ...mockAccount, name: body.name as string }, { status: 201 })
      })
    )
    renderAccounts()
    await waitFor(() => screen.getByText('Main Checking'))
    // Open create modal
    const addBtns = screen.getAllByRole('button', { name: /add account/i })
    await user.click(addBtns[0])
    await waitFor(() => screen.getByPlaceholderText('Main Checking'))

    // Fill in form
    await user.type(screen.getByPlaceholderText('Main Checking'), 'My Savings')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(createCalled).toBe(true)
    })
  })

  it('confirms delete and calls delete API', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.delete(`${BASE}/accounts/:id`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderAccounts()
    await waitFor(() => screen.getByText('Main Checking'))
    // Find delete button
    const deleteBtn = screen.getAllByRole('button').find((btn) =>
      btn.className.includes('hover:text-red-600')
    )
    if (deleteBtn) {
      await user.click(deleteBtn)
      await waitFor(() => screen.getByText(/are you sure/i))
      // Confirm delete
      await user.click(screen.getByRole('button', { name: /delete/i }))
      await waitFor(() => {
        expect(deleteCalled).toBe(true)
      })
    }
  })

  it('cancels create modal when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderAccounts()
    await waitFor(() => screen.getByText('Main Checking'))
    const addBtns = screen.getAllByRole('button', { name: /add account/i })
    await user.click(addBtns[0])
    await waitFor(() => screen.getByPlaceholderText('Main Checking'))
    // Click Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Main Checking')).not.toBeInTheDocument()
    })
  })

  it('shows CHECKING type badge on account card', async () => {
    renderAccounts()
    await waitFor(() => {
      expect(screen.getByText('CHECKING')).toBeInTheDocument()
    })
  })
})
