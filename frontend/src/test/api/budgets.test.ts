import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { budgetsApi } from '../../api/budgets'
import { mockBudget, mockBudgetProgress } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

describe('budgetsApi', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  describe('list', () => {
    it('returns array of budgets', async () => {
      const result = await budgetsApi.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].id).toBe(mockBudget.id)
    })
  })

  describe('create', () => {
    it('creates and returns a budget', async () => {
      const payload = {
        category_id: 'cat-1',
        amount: 500,
        period: 'MONTHLY' as const,
        start_date: '2024-01-01',
      }
      const result = await budgetsApi.create(payload)
      expect(result.id).toBe(mockBudget.id)
    })
  })

  describe('update', () => {
    it('updates and returns the budget', async () => {
      const result = await budgetsApi.update('budget-1', { amount: 600 })
      expect(result.id).toBe(mockBudget.id)
    })
  })

  describe('delete', () => {
    it('resolves without error', async () => {
      server.use(
        http.delete(`${BASE}/budgets/budget-1`, () => new HttpResponse(null, { status: 204 }))
      )
      await expect(budgetsApi.delete('budget-1')).resolves.toBeUndefined()
    })
  })

  describe('progress', () => {
    it('returns budget progress', async () => {
      const result = await budgetsApi.progress('budget-1')
      expect(result.budgeted).toBe(mockBudgetProgress.budgeted)
      expect(result.spent).toBe(mockBudgetProgress.spent)
      expect(result.percent_used).toBe(mockBudgetProgress.percent_used)
    })
  })

  describe('get', () => {
    it('returns a single budget', async () => {
      server.use(
        http.get(`${BASE}/budgets/budget-1`, () => HttpResponse.json(mockBudget))
      )
      const result = await budgetsApi.get('budget-1')
      expect(result.id).toBe(mockBudget.id)
    })
  })
})
