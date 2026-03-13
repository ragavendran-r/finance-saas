import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:8000/api/v1'

describe('apiClient', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
    localStorage.clear()
  })

  it('has the correct base URL', async () => {
    // Import after server is set up
    const { default: apiClient } = await import('../../api/client')
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000/api/v1')
  })

  it('attaches Authorization header when token exists in localStorage', async () => {
    localStorage.setItem('access_token', 'my-test-token')
    let capturedAuthHeader: string | undefined

    server.use(
      http.get(`${BASE}/auth/me`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization') ?? undefined
        return HttpResponse.json({ id: 'user-1', email: 'test@test.com' })
      })
    )

    const { default: apiClient } = await import('../../api/client')
    await apiClient.get('/auth/me')
    expect(capturedAuthHeader).toBe('Bearer my-test-token')
  })

  it('does not attach Authorization header when no token', async () => {
    localStorage.removeItem('access_token')
    let capturedAuthHeader: string | null = null

    server.use(
      http.get(`${BASE}/auth/me`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization')
        return HttpResponse.json({ id: 'user-1' })
      })
    )

    const { default: apiClient } = await import('../../api/client')
    await apiClient.get('/auth/me')
    expect(capturedAuthHeader).toBeNull()
  })

  it('rejects the promise on 401 response', async () => {
    localStorage.setItem('access_token', 'expired-token')

    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )

    const { default: apiClient } = await import('../../api/client')
    await expect(apiClient.get('/auth/me')).rejects.toThrow()
  })
})
