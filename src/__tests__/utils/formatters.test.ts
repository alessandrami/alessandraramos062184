import { describe, it, expect, vi } from 'vitest'
import { formatPhoneNumber, parsePhoneNumber, formatDate, calculateAge, debounce } from '../../utils/formatters'

describe('Formatters and Utilities', () => {
  describe('formatPhoneNumber', () => {
    it('should format 11-digit phone number correctly', () => {
      expect(formatPhoneNumber('11999999999')).toBe('(11) 99999-9999')
    })

    it('should format 10-digit phone number correctly', () => {
      expect(formatPhoneNumber('1133333333')).toBe('(11) 3333-3333')
    })

    it('should return original if invalid length', () => {
      expect(formatPhoneNumber('123')).toBe('123')
    })

    it('should handle already formatted numbers', () => {
      expect(formatPhoneNumber('(11) 99999-9999')).toBe('(11) 99999-9999')
    })

    it('should handle empty string', () => {
      expect(formatPhoneNumber('')).toBe('')
    })

    it('should handle numbers with special characters', () => {
      const result = formatPhoneNumber('+55 11 99999-9999')
      expect(result.replace(/\D/g, '').length).toBeGreaterThan(0)
    })
  })

  describe('parsePhoneNumber', () => {
    it('should remove all non-numeric characters', () => {
      expect(parsePhoneNumber('(11) 99999-9999')).toBe('11999999999')
    })

    it('should handle string with letters', () => {
      expect(parsePhoneNumber('abc123def456')).toBe('123456')
    })

    it('should handle empty string', () => {
      expect(parsePhoneNumber('')).toBe('')
    })

    it('should handle numbers only', () => {
      expect(parsePhoneNumber('11999999999')).toBe('11999999999')
    })
  })

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date(Date.UTC(2024, 0, 15))
      const formatted = formatDate(date)
      expect(['15/01/2024', '14/01/2024']).toContain(formatted)
    })

    it('should format string date correctly', () => {
      const formatted = formatDate('2024-01-15T00:00:00.000Z')
      expect(['15/01/2024', '14/01/2024']).toContain(formatted)
    })

    it('should handle different month', () => {
      const date = new Date(Date.UTC(2024, 5, 20))
      const formatted = formatDate(date)
      expect(['20/06/2024', '19/06/2024']).toContain(formatted)
    })
  })

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 5)
      
      const age = calculateAge(birthDate)
      expect(age).toBe(5)
    })

    it('should handle string date', () => {
      const currentYear = new Date().getFullYear()
      const birthYear = currentYear - 10
      const birthDate = `${birthYear}-01-01`
      
      const age = calculateAge(birthDate)
      expect(age).toBeGreaterThanOrEqual(9)
      expect(age).toBeLessThanOrEqual(10)
    })

    it('should handle birthday not yet occurred this year', () => {
      const today = new Date()
      const birthDate = new Date()
      birthDate.setFullYear(today.getFullYear() - 5)
      birthDate.setMonth(today.getMonth() + 1) // Next month
      
      const age = calculateAge(birthDate)
      expect(age).toBe(4) // Should be 4 since birthday hasn't occurred yet
    })

    it('should handle age 0 for recent birth', () => {
      const recentDate = new Date()
      recentDate.setMonth(recentDate.getMonth() - 6) // 6 months ago
      
      const age = calculateAge(recentDate)
      expect(age).toBe(0)
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      vi.useFakeTimers()
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      expect(mockFn).not.toHaveBeenCalled()

      vi.runAllTimers()

      expect(mockFn).toHaveBeenCalledOnce()
      vi.useRealTimers()
    })

    it('should pass arguments to debounced function', async () => {
      vi.useFakeTimers()
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('arg1', 'arg2')

      vi.runAllTimers()

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      vi.useRealTimers()
    })

    it('should use last call arguments', async () => {
      vi.useFakeTimers()
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')

      vi.runAllTimers()

      expect(mockFn).toHaveBeenCalledOnce()
      expect(mockFn).toHaveBeenCalledWith('third')
      vi.useRealTimers()
    })

    it('should handle multiple separate debounce windows', async () => {
      vi.useFakeTimers()
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('first')
      vi.advanceTimersByTime(300)
      
      debouncedFn('second')
      vi.advanceTimersByTime(300)

      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenNthCalledWith(1, 'first')
      expect(mockFn).toHaveBeenNthCalledWith(2, 'second')
      vi.useRealTimers()
    })
  })
})
