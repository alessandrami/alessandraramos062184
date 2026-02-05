import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatPhoneNumber, parsePhoneNumber, formatDate, debounce } from '../utils/formatters'

describe('Formatters', () => {
  describe('formatPhoneNumber', () => {
    it('should format 11-digit phone number correctly', () => {
      const phone = '11999999999'
      const formatted = formatPhoneNumber(phone)
      expect(formatted).toBe('(11) 99999-9999')
    })

    it('should format 10-digit phone number correctly', () => {
      const phone = '1133333333'
      const formatted = formatPhoneNumber(phone)
      expect(formatted).toBe('(11) 3333-3333')
    })

    it('should return original if invalid length', () => {
      const phone = '123'
      const formatted = formatPhoneNumber(phone)
      expect(formatted).toBe('123')
    })
  })

  describe('parsePhoneNumber', () => {
    it('should remove all non-numeric characters', () => {
      const phone = '(11) 99999-9999'
      const parsed = parsePhoneNumber(phone)
      expect(parsed).toBe('11999999999')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      // Cria a data em UTC para evitar problemas de fuso horário
      const date = new Date(Date.UTC(2024, 0, 15))
      const formatted = formatDate(date)
      expect(['15/01/2024', '14/01/2024']).toContain(formatted)
    })

    it('should handle string dates', () => {
      // Usa string ISO completa para garantir UTC
      const date = '2024-01-15T00:00:00.000Z'
      const formatted = formatDate(date)
      expect(['15/01/2024', '14/01/2024']).toContain(formatted)
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
  })
})
