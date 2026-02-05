import { describe, it, expect } from 'vitest'
import { Pet, Tutor } from '../../types'

describe('Types', () => {
  describe('Pet', () => {
    it('should create a valid Pet object', () => {
      const pet: Pet = {
        id: '1',
        nome: 'Fluffy',
        especie: 'Gato',
        idade: 3,
        raca: 'Persa',
        foto: 'https://example.com/cat.jpg',
        tutorId: '123',
      }

      expect(pet.id).toBe('1')
      expect(pet.nome).toBe('Fluffy')
      expect(pet.especie).toBe('Gato')
      expect(pet.idade).toBe(3)
      expect(pet.raca).toBe('Persa')
    })
  })

  describe('Tutor', () => {
    it('should create a valid Tutor object', () => {
      const tutor: Tutor = {
        id: '1',
        nome: 'João Silva',
        telefone: '11999999999',
        endereco: 'Rua A, 123',
        foto: 'https://example.com/user.jpg',
      }

      expect(tutor.id).toBe('1')
      expect(tutor.nome).toBe('João Silva')
      expect(tutor.telefone).toBe('11999999999')
      expect(tutor.endereco).toBe('Rua A, 123')
    })
  })
})
