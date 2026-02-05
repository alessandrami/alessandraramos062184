import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authService } from '../services/authService'
import { apiClient } from '../services/apiClient'

// Mock the apiClient
vi.mock('../services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
  },
  ONLINE_ONLY: false,
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
    vi.clearAllMocks()
  });

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(authService).toBeDefined()
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          token: 'mock-token-123',
          refreshToken: 'mock-refresh-token',
        },
      }
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const result = await authService.login('admin', 'password')

      expect(result.token).toBe('mock-token-123')
      expect(result.refreshToken).toBe('mock-refresh-token')
      expect(localStorageMock['authToken']).toBe('mock-token-123')
      expect(localStorageMock['refreshToken']).toBe('mock-refresh-token')
    })

    it('should handle login with access_token response', async () => {
      const mockResponse = {
        data: {
          access_token: 'access-token-456',
          refresh_token: 'refresh-token-456',
        },
      }
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const result = await authService.login('user', 'pass')

      expect(result.token).toBe('access-token-456')
      expect(localStorageMock['authToken']).toBe('access-token-456')
    })

    it('should throw error when token is not returned', async () => {
      const mockResponse = { data: {} }
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      await expect(authService.login('user', 'pass')).rejects.toThrow()
    })

    it('should fallback to local auth when API fails and ONLINE_ONLY is false', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.login('admin', 'admin')

      expect(result.token).toContain('admin-token-')
      expect(localStorageMock['authToken']).toBeDefined()
    })

    it('should throw error for invalid credentials in fallback mode', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'))

      await expect(authService.login('wrong', 'credentials')).rejects.toThrow('Credenciais inválidas')
    })
  })

  describe('logout', () => {
    it('should clear authentication data on logout', () => {
      localStorageMock['authToken'] = 'some-token'
      localStorageMock['refreshToken'] = 'some-refresh-token'

      authService.logout()

      expect(localStorageMock['authToken']).toBeUndefined()
      expect(localStorageMock['refreshToken']).toBeUndefined()
    })
  })

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorageMock['authToken'] = 'stored-token'

      const token = authService.getToken()

      expect(token).toBe('stored-token')
    })

    it('should return null when no token exists', () => {
      const token = authService.getToken()

      expect(token).toBeNull()
    })
  })

  describe('signup', () => {
    it('should signup successfully', async () => {
      const mockResponse = {
        data: {
          token: 'new-user-token',
          refreshToken: 'new-refresh-token',
        },
      }
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const result = await authService.signup({
        nome: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.token).toBe('new-user-token')
      expect(localStorageMock['authToken']).toBe('new-user-token')
    })

    it('should try alternative endpoint on 404', async () => {
      const error404 = { response: { status: 404 } }
      const mockSuccessResponse = {
        data: {
          token: 'alt-token',
          refreshToken: 'alt-refresh',
        },
      }
      
      vi.mocked(apiClient.post)
        .mockRejectedValueOnce(error404)
        .mockResolvedValueOnce(mockSuccessResponse)

      const result = await authService.signup({
        nome: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.token).toBe('alt-token')
      expect(apiClient.post).toHaveBeenCalledTimes(2)
    })
  })

  describe('refreshToken', () => {
    it('should have refreshToken method', () => {
      expect(typeof authService.refreshToken).toBe('function')
    })
  })

  describe('isAuthenticated observable', () => {
    it('should emit authentication state', () => {
      return new Promise<void>((resolve) => {
        authService.isAuthenticated$.subscribe((isAuth) => {
          expect(typeof isAuth).toBe('boolean')
          resolve()
        })
      })
    })
  })
})
