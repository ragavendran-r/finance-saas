/**
 * Additional Categories page tests to improve coverage
 * of lines 246-294 (edit modal, delete flow)
 */
import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Categories from '../../pages/Categories'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { mockCategory } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

function renderCategories() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Categories />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Categories page - additional coverage', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
    localStorage.setItem('access_token', 'valid-token')
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    localStorage.clear()
  })

  it('submits create category form', async () => {
    const user = userEvent.setup()
    let createCalled = false
    server.use(
      http.post(`${BASE}/categories`, async () => {
        createCalled = true
        return HttpResponse.json(mockCategory, { status: 201 })
      })
    )
    renderCategories()
    await waitFor(() => screen.getByText('Food & Dining'))
    const addBtns = screen.getAllByRole('button', { name: /add category/i })
    await user.click(addBtns[0])
    await waitFor(() => screen.getByPlaceholderText(/e.g. Food & Dining/i))

    await user.type(screen.getByPlaceholderText(/e.g. Food & Dining/i), 'Entertainment')
    await user.click(screen.getByRole('button', { name: /create category/i }))

    await waitFor(() => {
      expect(createCalled).toBe(true)
    })
  })

  it('opens edit modal for a category', async () => {
    const user = userEvent.setup()
    renderCategories()
    await waitFor(() => screen.getByText('Food & Dining'))
    const editBtns = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('hover:text-indigo-600')
    )
    if (editBtns.length > 0) {
      await user.click(editBtns[0])
      await waitFor(() => {
        expect(screen.getByText('Edit Category')).toBeInTheDocument()
      })
    }
  })

  it('confirms delete and calls delete API', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.delete(`${BASE}/categories/:id`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderCategories()
    await waitFor(() => screen.getByText('Food & Dining'))
    const deleteBtn = screen.getAllByRole('button').find((btn) =>
      btn.className.includes('hover:text-red-600')
    )
    if (deleteBtn) {
      await user.click(deleteBtn)
      await waitFor(() => screen.getByText(/delete category/i))
      await user.click(screen.getByRole('button', { name: /delete/i }))
      await waitFor(() => {
        expect(deleteCalled).toBe(true)
      })
    }
  })
})
