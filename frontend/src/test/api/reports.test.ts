import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { reportsApi } from '../../api/reports'
import { mockNetWorth, mockIncomeVsExpenses, mockBudgetProgress, mockCategory } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

describe('reportsApi', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  describe('spendingByCategory', () => {
    it('returns spending data', async () => {
      const result = await reportsApi.spendingByCategory('2024-01-01', '2024-01-31')
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].total).toBe(200)
      expect(result[0].category?.id).toBe(mockCategory.id)
    })

    it('passes date params', async () => {
      let capturedUrl: string | undefined
      server.use(
        http.get(`${BASE}/reports/spending-by-category`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json([])
        })
      )
      await reportsApi.spendingByCategory('2024-01-01', '2024-01-31')
      expect(capturedUrl).toContain('date_from=2024-01-01')
      expect(capturedUrl).toContain('date_to=2024-01-31')
    })
  })

  describe('incomeVsExpenses', () => {
    it('returns income vs expenses data', async () => {
      const result = await reportsApi.incomeVsExpenses('2024-01-01', '2024-01-31')
      expect(result.income).toBe(mockIncomeVsExpenses.income)
      expect(result.expenses).toBe(mockIncomeVsExpenses.expenses)
      expect(result.net).toBe(mockIncomeVsExpenses.net)
    })
  })

  describe('netWorth', () => {
    it('returns net worth data', async () => {
      const result = await reportsApi.netWorth()
      expect(result.total).toBe(mockNetWorth.total)
      expect(result.by_account_type).toBeDefined()
    })
  })

  describe('budgetVsActual', () => {
    it('returns budget vs actual data', async () => {
      const result = await reportsApi.budgetVsActual('2024-01-01', '2024-01-31')
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].budgeted).toBe(mockBudgetProgress.budgeted)
    })

    it('passes date params', async () => {
      let capturedUrl: string | undefined
      server.use(
        http.get(`${BASE}/reports/budget-vs-actual`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json([])
        })
      )
      await reportsApi.budgetVsActual('2024-02-01', '2024-02-29')
      expect(capturedUrl).toContain('date_from=2024-02-01')
      expect(capturedUrl).toContain('date_to=2024-02-29')
    })
  })
})
