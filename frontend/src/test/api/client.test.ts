import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:8000/api/v1'

describe('apiClient', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(async () => {
    server.resetHandlers()
    server.close()
    // Reset in-memory token between tests
    const { setAccessToken } = await import('../../api/client')
    setAccessToken(null)
  })

  it('has the correct base URL', async () => {
    const { default: apiClient } = await import('../../api/client')
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000/api/v1')
  })

  it('attaches Authorization header when token exists in memory', async () => {
    const { default: apiClient, setAccessToken } = await import('../../api/client')
    setAccessToken('my-test-token')
    let capturedAuthHeader: string | undefined

    server.use(
      http.get(`${BASE}/auth/me`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization') ?? undefined
        return HttpResponse.json({ id: 'user-1', email: 'test@test.com' })
      })
    )

    await apiClient.get('/auth/me')
    expect(capturedAuthHeader).toBe('Bearer my-test-token')
  })

  it('does not attach Authorization header when no token', async () => {
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
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )

    const { default: apiClient } = await import('../../api/client')
    await expect(apiClient.get('/auth/me')).rejects.toThrow()
  })
})
