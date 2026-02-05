import type { Pet, Tutor, PaginationResponse } from '../types';

export const mockPets: Pet[] = [
  {
    id: '1',
    nome: 'Rex',
    especie: 'cao',
    idade: 3,
    raca: 'Labrador',
    foto: 'https://via.placeholder.com/400x300?text=Rex',
    tutorIds: ['1'],
  },
  {
    id: '2',
    nome: 'Miau',
    especie: 'gato',
    idade: 2,
    raca: 'Persa',
    foto: 'https://via.placeholder.com/400x300?text=Miau',
    tutorIds: ['2'],
  },
  {
    id: '3',
    nome: 'Bolinha',
    especie: 'cao',
    idade: 1,
    raca: 'Poodle',
    foto: 'https://via.placeholder.com/400x300?text=Bolinha',
    tutorIds: ['1'],
  },
  {
    id: '4',
    nome: 'Nala',
    especie: 'gato',
    idade: 4,
    raca: 'Siamês',
    foto: 'https://via.placeholder.com/400x300?text=Nala',
    tutorIds: ['3'],
  },
  {
    id: '5',
    nome: 'Max',
    especie: 'cao',
    idade: 5,
    raca: 'Golden Retriever',
    foto: 'https://via.placeholder.com/400x300?text=Max',
    tutorIds: ['2'],
  },
];

export const mockTutores: Tutor[] = [
  {
    id: '1',
    nome: 'João Silva',
    telefone: '(11) 99999-8888',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    foto: 'https://via.placeholder.com/400x300?text=João',
  },
  {
    id: '2',
    nome: 'Maria Santos',
    telefone: '(11) 98888-7777',
    endereco: 'Av. Paulista, 1000 - São Paulo, SP',
    foto: 'https://via.placeholder.com/400x300?text=Maria',
  },
  {
    id: '3',
    nome: 'Carlos Oliveira',
    telefone: '(11) 97777-6666',
    endereco: 'Rua das Acácias, 456 - São Paulo, SP',
    foto: 'https://via.placeholder.com/400x300?text=Carlos',
  },
];

export function getPaginatedPets(
  page: number,
  pageSize: number,
  search?: string
): PaginationResponse<Pet> {
  let filtered = [...mockPets];

  if (search) {
    filtered = filtered.filter(pet =>
      pet.nome.toLowerCase().includes(search.toLowerCase())
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = filtered.slice(start, end);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages,
  };
}

export function getPetById(id: string): Pet | undefined {
  return mockPets.find(pet => pet.id === id);
}

export function getPaginatedTutores(
  page: number,
  pageSize: number
): PaginationResponse<Tutor> {
  const total = mockTutores.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = mockTutores.slice(start, end);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages,
  };
}

export function getTutorById(id: string): Tutor | undefined {
  return mockTutores.find(tutor => tutor.id === id);
}
