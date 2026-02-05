import { describe, it, expect } from 'vitest'
import { apiClient } from '../../services/apiClient'

describe('API Client', () => {
  it('should have axiosInstance configured', () => {
    expect(apiClient).toBeDefined()
  })

  it('should have get method', () => {
    expect(typeof apiClient.get).toBe('function')
  })

  it('should have post method', () => {
    expect(typeof apiClient.post).toBe('function')
  })

  it('should have put method', () => {
    expect(typeof apiClient.put).toBe('function')
  })

  it('should have delete method', () => {
    expect(typeof apiClient.delete).toBe('function')
  })

  it('should have patch method', () => {
    expect(typeof apiClient.patch).toBe('function')
  })

  describe('API Configuration', () => {
    it('should export ONLINE_ONLY flag', async () => {
      const module = await import('../../services/apiClient')
      expect(typeof module.ONLINE_ONLY).toBe('boolean')
    })
  })
})



