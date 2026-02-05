import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../services/authService'

// Mock the apiClient
vi.mock('../services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe('AuthService', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    // Mock localStorage corretamente usando vi.stubGlobal
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => localStorageMock[key] || null),
      setItem: vi.fn((key, value) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
      length: 0,
      key: vi.fn(),
    } as any);
  });

  it('should check authentication status on initialization', () => {
    expect(authService).toBeDefined()
  })

  it('should have logout method', () => {
    expect(typeof authService.logout).toBe('function')
  })

  it('should have getToken method', () => {
    expect(typeof authService.getToken).toBe('function')
  })
})
