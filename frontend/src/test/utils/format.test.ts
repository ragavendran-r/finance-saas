import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatPercent } from '../../utils/format'

describe('formatCurrency', () => {
  it('formats a positive number as USD by default', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-250.5)).toBe('-$250.50')
  })

  it('formats with two decimal places', () => {
    expect(formatCurrency(9.9)).toBe('$9.90')
  })

  it('supports a different currency', () => {
    const result = formatCurrency(100, 'EUR')
    expect(result).toContain('100')
    // EUR symbol or code should appear
    expect(result).toMatch(/€|EUR/)
  })

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
  })
})

describe('formatDate', () => {
  it('formats a date string into a readable format', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('formats different months', () => {
    expect(formatDate('2024-06-01')).toContain('Jun')
    expect(formatDate('2024-12-31')).toContain('Dec')
  })
})

describe('formatPercent', () => {
  it('rounds to nearest integer and appends %', () => {
    expect(formatPercent(45)).toBe('45%')
  })

  it('rounds fractional values', () => {
    expect(formatPercent(45.6)).toBe('46%')
    expect(formatPercent(45.4)).toBe('45%')
  })

  it('handles 0', () => {
    expect(formatPercent(0)).toBe('0%')
  })

  it('handles 100', () => {
    expect(formatPercent(100)).toBe('100%')
  })

  it('handles values over 100', () => {
    expect(formatPercent(150)).toBe('150%')
  })
})
