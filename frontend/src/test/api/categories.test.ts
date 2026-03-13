import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { categoriesApi } from '../../api/categories'
import { mockCategory } from '../mocks/handlers'

const BASE = 'http://localhost:8000/api/v1'

describe('categoriesApi', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  describe('list', () => {
    it('returns array of categories', async () => {
      const result = await categoriesApi.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].id).toBe(mockCategory.id)
      expect(result[0].name).toBe(mockCategory.name)
    })
  })

  describe('create', () => {
    it('creates and returns a category', async () => {
      const result = await categoriesApi.create({ name: 'Food', icon: '🍔', color: '#red' })
      expect(result.id).toBe(mockCategory.id)
    })

    it('throws on error', async () => {
      server.use(
        http.post(`${BASE}/categories`, () =>
          HttpResponse.json({ detail: 'Error' }, { status: 422 })
        )
      )
      await expect(categoriesApi.create({ name: '' })).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('updates and returns the category', async () => {
      const result = await categoriesApi.update('cat-1', { name: 'Updated Food' })
      expect(result.id).toBe(mockCategory.id)
    })
  })

  describe('delete', () => {
    it('resolves without error', async () => {
      server.use(
        http.delete(`${BASE}/categories/cat-1`, () => new HttpResponse(null, { status: 204 }))
      )
      await expect(categoriesApi.delete('cat-1')).resolves.toBeUndefined()
    })
  })
})
