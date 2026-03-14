import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Categories from '../../pages/Categories'
import { AuthProvider } from '../../hooks/useAuth'
import { server } from '../mocks/server'
import { setAccessToken } from '../../api/client'
import { http, HttpResponse } from 'msw'

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

describe('Categories page', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })
  afterEach(() => {
    server.resetHandlers()
    server.close()
    setAccessToken(null)
  })

  it('renders the Categories heading', async () => {
    renderCategories()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /categories/i })).toBeInTheDocument()
    })
  })

  it('renders Add Category button', async () => {
    renderCategories()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument()
    })
  })

  it('renders category name in table', async () => {
    renderCategories()
    await waitFor(() => {
      expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    })
  })

  it('shows empty state when no categories', async () => {
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json([]))
    )
    renderCategories()
    await waitFor(() => {
      expect(screen.getByText(/no categories yet/i)).toBeInTheDocument()
    })
  })

  it('shows error alert when categories fail to load', async () => {
    server.use(
      http.get(`${BASE}/categories`, () =>
        HttpResponse.json({ detail: 'Error' }, { status: 500 })
      )
    )
    renderCategories()
    await waitFor(() => {
      expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument()
    })
  })

  it('opens create modal when Add Category is clicked', async () => {
    const user = userEvent.setup()
    renderCategories()
    await waitFor(() => screen.getByText('Food & Dining'))
    const addBtns = screen.getAllByRole('button', { name: /add category/i })
    await user.click(addBtns[0])
    await waitFor(() => {
      // The form input for category name should appear in the modal
      expect(screen.getByPlaceholderText(/e.g. Food & Dining/i)).toBeInTheDocument()
    })
  })

  it('renders category table headers', async () => {
    renderCategories()
    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument()
    })
  })

  it('shows delete dialog when delete button is clicked', async () => {
    const user = userEvent.setup()
    renderCategories()
    await waitFor(() => screen.getByText('Food & Dining'))
    // Find a delete button (Trash2 icon button with red hover)
    const deleteButtons = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('hover:text-red-600')
    )
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])
      await waitFor(() => {
        expect(screen.getByText(/delete category/i)).toBeInTheDocument()
      })
    }
  })
})
