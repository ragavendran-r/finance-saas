import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { usersApi } from '../../api/users'
import { mockUser } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

describe('usersApi', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  describe('list', () => {
    it('returns array of users', async () => {
      const result = await usersApi.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].id).toBe(mockUser.id)
      expect(result[0].email).toBe(mockUser.email)
    })

    it('throws on server error', async () => {
      server.use(
        http.get(`${BASE}/users`, () =>
          HttpResponse.json({ detail: 'Forbidden' }, { status: 403 })
        )
      )
      await expect(usersApi.list()).rejects.toThrow()
    })
  })
})
