import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { authApi } from '../../api/auth'
import { mockUser } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

describe('authApi', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
    localStorage.clear()
  })

  describe('login', () => {
    it('returns access_token on success', async () => {
      const result = await authApi.login('test@example.com', 'password123')
      expect(result.access_token).toBe('test-token')
      expect(result.token_type).toBe('bearer')
    })

    it('throws on invalid credentials', async () => {
      server.use(
        http.post(`${BASE}/auth/login`, () =>
          HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
        )
      )
      await expect(authApi.login('bad@example.com', 'wrong')).rejects.toThrow()
    })
  })

  describe('register', () => {
    it('returns user data on success', async () => {
      const payload = {
        tenant_name: 'Test Org',
        tenant_slug: 'test-org',
        email: 'new@example.com',
        password: 'password123',
        full_name: 'New User',
      }
      const result = await authApi.register(payload)
      expect(result.id).toBe(mockUser.id)
      expect(result.email).toBe(mockUser.email)
    })

    it('throws on conflict error', async () => {
      server.use(
        http.post(`${BASE}/auth/register`, () =>
          HttpResponse.json({ detail: 'Email already exists' }, { status: 409 })
        )
      )
      await expect(
        authApi.register({
          tenant_name: 'Test',
          tenant_slug: 'test',
          email: 'existing@example.com',
          password: 'password',
          full_name: 'Test User',
        })
      ).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('resolves without error', async () => {
      await expect(authApi.logout()).resolves.toBeUndefined()
    })
  })

  describe('me', () => {
    it('returns current user', async () => {
      const result = await authApi.me()
      expect(result.id).toBe(mockUser.id)
      expect(result.email).toBe(mockUser.email)
      expect(result.full_name).toBe(mockUser.full_name)
    })

    it('throws on 401', async () => {
      server.use(
        http.get(`${BASE}/auth/me`, () =>
          HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
        )
      )
      await expect(authApi.me()).rejects.toThrow()
    })
  })
})
