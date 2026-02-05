import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TutorService } from '../../services/tutorService'
import { apiClient } from '../../services/apiClient'

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ONLINE_ONLY: false,
}))

describe('TutorService', () => {
  let tutorService: TutorService
  let localStorageMock: Record<string, string>

  beforeEach(() => {
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
      keys: vi.fn(() => Object.keys(localStorageMock)),
    } as any)
    
    Object.defineProperty(global.localStorage, 'keys', {
      value: () => Object.keys(localStorageMock),
      writable: true,
    })
    
    vi.clearAllMocks()
    tutorService = new TutorService()
  })

  it('should be defined', () => {
    expect(tutorService).toBeDefined()
  })

  describe('getTutorById', () => {
    it('should fetch tutor by id', async () => {
      const mockResponse = {
        data: {
          id: '1',
          nome: 'João Silva',
          telefone: '11999999999',
          endereco: 'Rua A, 123',
        },
      }
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

      const result = await tutorService.getTutorById('1')

      expect(result).toBeDefined()
      expect(result.nome).toBe('João Silva')
      // Check that nome exists for merged data
      expect(typeof result.nome).toBe('string')
    })
  })

  describe('createTutor', () => {
    it('should create a new tutor', async () => {
      const newTutor = {
        nome: 'Carlos Oliveira',
        telefone: '11977777777',
        endereco: 'Rua C, 789',
      }
      const mockResponse = {
        data: { id: '3', ...newTutor },
      }
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const result = await tutorService.createTutor(newTutor)

      expect(result.id).toBe('3')
      expect(result.nome).toBe('Carlos Oliveira')
    })
  })

  describe('deleteTutor', () => {
    it('should delete a tutor', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} })

      await tutorService.deleteTutor('1')

      expect(apiClient.delete).toHaveBeenCalled()
    })
  })

  describe('uploadTutorPhoto', () => {
    it('should upload tutor photo', async () => {
      const mockFile = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
      const mockResponse = {
        data: { foto: 'https://example.com/uploaded-photo.jpg' },
      }
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const result = await tutorService.uploadTutorPhoto('1', mockFile)

      expect(result).toBeDefined()
      expect(apiClient.post).toHaveBeenCalled()
    })
  })

  describe('observables', () => {
    it('should have tutors$ observable', () => {
      return new Promise<void>((resolve) => {
        tutorService.tutors$.subscribe((tutors) => {
          expect(Array.isArray(tutors)).toBe(true)
          resolve()
        })
      })
    })

    it('should have currentTutor$ observable', () => {
      return new Promise<void>((resolve) => {
        tutorService.currentTutor$.subscribe((tutor) => {
          expect(tutor === null || typeof tutor === 'object').toBe(true)
          resolve()
        })
      })
    })

    it('should have loading$ observable', () => {
      return new Promise<void>((resolve) => {
        tutorService.loading$.subscribe((loading) => {
          expect(typeof loading).toBe('boolean')
          resolve()
        })
      })
    })
  })
})

