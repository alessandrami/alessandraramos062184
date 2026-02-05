import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import React from 'react'

vi.mock('../../services/authService', () => ({
  authService: {
    isAuthenticated$: {
      subscribe: vi.fn((callback) => {
        callback(false)
        return { unsubscribe: vi.fn() }
      }),
    },
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
    refreshToken: vi.fn(),
    getToken: vi.fn(),
  },
}))

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide authentication context', () => {
    const TestComponent = () => {
      const { isAuthenticated,login, logout } = useAuth()
      return (
        <div>
          <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
          <button onClick={() => login('user', 'pass')}>Login</button>
          <button onClick={logout}>Logout</button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toBeDefined()
  })

  it('should have login function', () => {
    const TestComponent = () => {
      const { login } = useAuth()
      expect(typeof login).toBe('function')
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
  })

  it('should have logout function', () => {
    const TestComponent = () => {
      const { logout } = useAuth()
      expect(typeof logout).toBe('function')
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
  })
})

