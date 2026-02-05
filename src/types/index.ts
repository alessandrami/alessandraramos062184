export interface Documento {
  nome: string;
  url: string;
}

export interface Pet {
  id: string;
  nome: string;
  especie: string;
  idade: number;
  raca: string;
  foto?: string;
  imagens?: Documento[];
  tutorIds?: string[];
  dataCriacao?: string;
  dataAtualizacao?: string;
  documentos?: Documento[];
}

export interface Tutor {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  foto?: string;
  documentos?: Documento[];
  dataCriacao?: string;
  dataAtualizacao?: string;
  petIds?: string[];
}

export interface PaginationResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  // Compatibilidade com a API oficial
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}