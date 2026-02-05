import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { PetCard } from '../../components/PetCard'
import { Pet } from '../../types'

describe('PetCard', () => {
  const mockPet: Pet = {
    id: '1',
    nome: 'Rex',
    especie: 'Cachorro',
    raca: 'Labrador',
    idade: 3,
    foto: 'https://example.com/rex.jpg',
    tutorId: '123',
  }

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render without crashing', () => {
    const { container } = renderWithRouter(<PetCard pet={mockPet} />)
    expect(container).toBeDefined()
  })

  it('should display pet information', () => {
    const { container } = renderWithRouter(<PetCard pet={mockPet} />)
    const text = container.textContent || ''
    expect(text).toContain('Rex')
  })

  it('should handle pet without photo', () => {
    const petWithoutPhoto: Pet = { ...mockPet, foto: undefined }
    const { container } = renderWithRouter(<PetCard pet={petWithoutPhoto} />)
    expect(container).toBeDefined()
  })

  it('should create link to pet details', () => {
    const { container } = renderWithRouter(<PetCard pet={mockPet} />)
    const link = container.querySelector('a')
    expect(link).toBeDefined()
    expect(link?.getAttribute('href')).toBe('/pets/1')
  })

  it('should handle pet with images array', () => {
    const petWithImages: Pet = {
      ...mockPet,
      imagens: [{ id: '1', url: 'https://example.com/image1.jpg', tipo: 'imagem' }],
    }
    const { container } = renderWithRouter(<PetCard pet={petWithImages} />)
    expect(container).toBeDefined()
  })

  it('should handle different species types', () => {
    const pets = [
      { ...mockPet, especie: 'Gato' },
      { ...mockPet, especie: { nome: 'Pássaro' } as any },
    ]

    pets.forEach(pet => {
      const { container } = renderWithRouter(<PetCard pet={pet} />)
      expect(container).toBeDefined()
    })
  })

  it('should handle different age values', () => {
    const ages = [0, 1, 5, 10]
    
    ages.forEach(idade => {
      const pet = { ...mockPet, idade }
      const { container } = renderWithRouter(<PetCard pet={pet} />)
      expect(container).toBeDefined()
    })
  })
})

