import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { accountsApi } from '../../api/accounts'
import { mockAccount } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

describe('accountsApi', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  describe('list', () => {
    it('returns array of accounts', async () => {
      const result = await accountsApi.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].id).toBe(mockAccount.id)
      expect(result[0].name).toBe(mockAccount.name)
    })

    it('throws on server error', async () => {
      server.use(
        http.get(`${BASE}/accounts`, () =>
          HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        )
      )
      await expect(accountsApi.list()).rejects.toThrow()
    })
  })

  describe('create', () => {
    it('creates and returns a new account', async () => {
      const payload = {
        name: 'Savings',
        type: 'SAVINGS' as const,
        currency: 'USD',
        balance: 5000,
      }
      const result = await accountsApi.create(payload)
      expect(result.id).toBe(mockAccount.id)
    })

    it('throws on validation error', async () => {
      server.use(
        http.post(`${BASE}/accounts`, () =>
          HttpResponse.json({ detail: 'Validation error' }, { status: 422 })
        )
      )
      await expect(
        accountsApi.create({ name: '', type: 'CHECKING', currency: 'USD', balance: 0 })
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('updates and returns the account', async () => {
      const result = await accountsApi.update('acc-1', { name: 'Updated Name' })
      expect(result.id).toBe(mockAccount.id)
    })
  })

  describe('delete', () => {
    it('resolves without error', async () => {
      server.use(
        http.delete(`${BASE}/accounts/acc-1`, () => new HttpResponse(null, { status: 204 }))
      )
      await expect(accountsApi.delete('acc-1')).resolves.toBeUndefined()
    })
  })

  describe('get', () => {
    it('returns a single account', async () => {
      server.use(
        http.get(`${BASE}/accounts/acc-1`, () => HttpResponse.json(mockAccount))
      )
      const result = await accountsApi.get('acc-1')
      expect(result.id).toBe(mockAccount.id)
    })
  })
})
