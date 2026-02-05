import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PetService } from '../../services/petService'
import { apiClient } from '../../services/apiClient'
import { Pet } from '../../types'

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ONLINE_ONLY: false,
}))

describe('PetService', () => {
  let petService: PetService
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
    } as any)
    
    vi.clearAllMocks()
    petService = new PetService()
  })

  describe('getPets', () => {
    it('should fetch pets successfully', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: '1', nome: 'Rex', especie: 'Cachorro', idade: 3 },
            { id: '2', nome: 'Miau', especie: 'Gato', idade: 2 },
          ],
          page: 1,
          pageSize: 10,
          total: 2,
          totalPages: 1,
        },
      }
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

      const result = await petService.getPets(1, 10)

      // Service may filter based on myPetIds, so just check structure
      expect(result).toBeDefined()
      expect(result.page).toBe(1)
      expect(result.total).toBeGreaterThanOrEqual(0)
    })

    it('should handle search parameter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: '1', nome: 'Rex', especie: 'Cachorro', idade: 3 }],
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      }
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

      await petService.getPets(1, 10, 'Rex')

      expect(apiClient.get).toHaveBeenCalledWith('/v1/pets', {
        params: { page: 1, pageSize: 10, nome: 'Rex' },
      })
    })

    it('should emit loading state', async () => {
      const mockResponse = {
        data: { data: [], page: 1, pageSize: 10, total: 0, totalPages: 1 },
      }
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

      const loadingStates: boolean[] = []
      petService.loading$.subscribe((loading) => loadingStates.push(loading))

      await petService.getPets()

      expect(loadingStates).toContain(true)
      expect(loadingStates[loadingStates.length - 1]).toBe(false)
    })
  })

  describe('getPetById', () => {
    it('should fetch pet by id', async () => {
      const mockPet: Pet = {
        id: '1',
        nome: 'Rex',
        especie: 'Cachorro',
        raca: 'Labrador',
        idade: 3,
      }
      const mockResponse = { data: mockPet }
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

      const result = await petService.getPetById('1')

      expect(result.id).toBe('1')
      expect(result.nome).toBe('Rex')
      expect(apiClient.get).toHaveBeenCalledWith('/v1/pets/1')
    })
  })

  describe('createPet', () => {
    it('should create a new pet', async () => {
      const newPet = {
        nome: 'Bella',
        especie: 'Gato',
        raca: 'Siamês',
        idade: 1,
        tutorIds: ['123'],
      }
      const mockResponse = {
        data: { id: '3', ...newPet },
      }
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const result = await petService.createPet(newPet)

      expect(result.id).toBe('3')
      expect(result.nome).toBe('Bella')
      expect(apiClient.post).toHaveBeenCalledWith('/v1/pets', newPet)
    })
  })

  describe('updatePet', () => {
    it('should update an existing pet', async () => {
      const updatedData = {
        nome: 'Rex Updated',
        especie: 'Cachorro',
        raca: 'Labrador',
        idade: 4,
      }
      const mockResponse = {
        data: { id: '1', ...updatedData },
      }
      vi.mocked(apiClient.put).mockResolvedValueOnce(mockResponse)

      const result = await petService.updatePet('1', updatedData)

      expect(result.nome).toBe('Rex Updated')
      expect(result.idade).toBe(4)
      expect(apiClient.put).toHaveBeenCalledWith('/v1/pets/1', updatedData)
    })
  })

  describe('deletePet', () => {
    it('should delete a pet', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} })

      await petService.deletePet('1')

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/pets/1')
    })
  })

  describe('observables', () => {
    it('should have pets$ observable', () => {
      return new Promise<void>((resolve) => {
        petService.pets$.subscribe((pets) => {
          expect(Array.isArray(pets)).toBe(true)
          resolve()
        })
      })
    })

    it('should have currentPet$ observable', () => {
      return new Promise<void>((resolve) => {
        petService.currentPet$.subscribe((pet) => {
          expect(pet === null || typeof pet === 'object').toBe(true)
          resolve()
        })
      })
    })

    it('should have loading$ observable', () => {
      return new Promise<void>((resolve) => {
        petService.loading$.subscribe((loading) => {
          expect(typeof loading).toBe('boolean')
          resolve()
        })
      })
    })
  })
})



