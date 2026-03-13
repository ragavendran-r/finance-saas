import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { transactionsApi } from '../../api/transactions'
import { mockTransaction } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

describe('transactionsApi', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  describe('list', () => {
    it('returns array of transactions', async () => {
      const result = await transactionsApi.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].id).toBe(mockTransaction.id)
    })

    it('passes filters as query params', async () => {
      let capturedUrl: string | undefined
      server.use(
        http.get(`${BASE}/transactions`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json([mockTransaction])
        })
      )
      await transactionsApi.list({ search: 'grocery', account_id: 'acc-1', limit: 10 })
      expect(capturedUrl).toContain('search=grocery')
      expect(capturedUrl).toContain('account_id=acc-1')
      expect(capturedUrl).toContain('limit=10')
    })

    it('works without filters', async () => {
      const result = await transactionsApi.list()
      expect(result).toBeDefined()
    })
  })

  describe('create', () => {
    it('creates and returns a transaction', async () => {
      const payload = {
        account_id: 'acc-1',
        amount: 50,
        type: 'DEBIT' as const,
        description: 'Coffee',
        date: '2024-01-15',
        is_recurring: false,
      }
      const result = await transactionsApi.create(payload)
      expect(result.id).toBe(mockTransaction.id)
    })
  })

  describe('update', () => {
    it('updates and returns the transaction', async () => {
      const result = await transactionsApi.update('tx-1', { description: 'Updated' })
      expect(result.id).toBe(mockTransaction.id)
    })
  })

  describe('delete', () => {
    it('resolves without error', async () => {
      server.use(
        http.delete(`${BASE}/transactions/tx-1`, () => new HttpResponse(null, { status: 204 }))
      )
      await expect(transactionsApi.delete('tx-1')).resolves.toBeUndefined()
    })
  })

  describe('get', () => {
    it('returns a single transaction', async () => {
      server.use(
        http.get(`${BASE}/transactions/tx-1`, () => HttpResponse.json(mockTransaction))
      )
      const result = await transactionsApi.get('tx-1')
      expect(result.id).toBe(mockTransaction.id)
    })
  })
})
