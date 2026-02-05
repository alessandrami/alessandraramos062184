import { BehaviorSubject } from 'rxjs';
import { apiClient, ONLINE_ONLY } from './apiClient';
import { type Pet, type PaginationResponse } from '../types';

export class PetService {
  private petsSubject = new BehaviorSubject<Pet[]>([]);
  public pets$ = this.petsSubject.asObservable();

  private currentPetSubject = new BehaviorSubject<Pet | null>(null);
  public currentPet$ = this.currentPetSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Armazenar pets criados/atualizados localmente
  private localPets: Map<string, Pet> = new Map();

  constructor() {
    // Carregar pets locais do localStorage ao inicializar
    this.loadLocalPets();
    
    // Se estamos em modo ONLINE_ONLY, remover dados locais de pets para evitar cartões locais inválidos
    if (ONLINE_ONLY) {
      if (this.localPets.size > 0 || localStorage.getItem('myPetIds')) {
        console.log('[PetService] ONLINE_ONLY ativo — removendo pets locais do localStorage');
        // Remover chaves pet_<id>
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('pet_')) {
            localStorage.removeItem(key);
          }
        }
        localStorage.removeItem('myPetIds');
        this.localPets.clear();
      }
    }
  }

  private loadLocalPets(): void {
    const myPetIds = this.getUserPetIds();
    const validPetIds = new Set<string>();
    
    for (const petId of myPetIds) {
      const storedPet = localStorage.getItem(`pet_${petId}`);
      if (storedPet) {
        try {
          const pet = JSON.parse(storedPet);
          this.localPets.set(String(petId), pet);
          validPetIds.add(petId);
        } catch (err) {
          console.warn('[PetService] Erro ao parsear pet do localStorage:', petId);
        }
      }
    }
    
    // Atualizar myPetIds apenas com IDs válidos
    this.saveUserPetIds(validPetIds);
  }

  // Rastrear IDs de pets criados pelo usuário atual
  private getUserPetIds(): Set<string> {
    const stored = localStorage.getItem('myPetIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  }

  private saveUserPetIds(ids: Set<string>): void {
    localStorage.setItem('myPetIds', JSON.stringify(Array.from(ids)));
  }

  private addUserPetId(id: string | number): void {
    const idStr = String(id);
    const ids = this.getUserPetIds();
    ids.add(idStr);
    this.saveUserPetIds(ids);
  }

  private removeUserPetId(id: string | number): void {
    const idStr = String(id);
    const ids = this.getUserPetIds();
    ids.delete(idStr);
    this.saveUserPetIds(ids);
  }

  async getPets(page: number = 1, pageSize: number = 10, search: string = ''): Promise<PaginationResponse<Pet>> {
    this.loadingSubject.next(true);
    try {
      try {
        const myPetIds = this.getUserPetIds();
        console.log('[PetService] Buscando pets. myPetIds:', Array.from(myPetIds));
        const params: any = { page, pageSize };
        if (search) params.nome = search;
        const response = await apiClient.get<PaginationResponse<Pet>>('/v1/pets', { params });
        
        // Extrair dados com fallback robusto
        let petsData: Pet[] = [];
        let pagination = { page, pageSize, total: 0, totalPages: 1 };
        
        if (response.data) {
          // Tentar encontrar array de pets em diferentes locais
          if (Array.isArray(response.data.data)) {
            petsData = response.data.data;
            pagination = { 
              page: response.data.page || page, 
              pageSize: response.data.pageSize || pageSize,
              total: response.data.total || 0,
              totalPages: response.data.totalPages || 1
            };
          } else if (Array.isArray(response.data)) {
            petsData = response.data;
          }
        }
        
        console.log('[PetService] Pets carregados da API:', petsData.length);
        
        // Mesclar pets da API com cache local (para pegar fotos/documentos)
        const petsDataMerged = petsData.map(pet => {
          const cachedPet = this.localPets.get(String(pet.id));
          const storedPet = localStorage.getItem(`pet_${pet.id}`);
          let localData = cachedPet;
          
          // Se não está no cache, tentar localStorage
          if (!localData && storedPet) {
            try {
              localData = JSON.parse(storedPet);
            } catch {}
          }
          
          // Mesclar: priorizar fotos/documentos do cache local
          const hasLocalFoto = !!localData && Object.prototype.hasOwnProperty.call(localData, 'foto');
          const hasLocalImagens = !!localData && Object.prototype.hasOwnProperty.call(localData, 'imagens');
          const hasLocalDocs = !!localData && Object.prototype.hasOwnProperty.call(localData, 'documentos');

          return {
            ...pet,
            foto: hasLocalFoto ? localData?.foto : pet.foto,
            imagens: hasLocalImagens ? localData?.imagens : pet.imagens,
            documentos: hasLocalDocs ? localData?.documentos : pet.documentos
          } as Pet;
        });
        
        // Filtrar apenas pets criados pelo usuário atual
        const myPets: Pet[] = petsDataMerged.filter(p => myPetIds.has(String(p.id)));
        
        console.log('[PetService] Meus pets:', myPets.length, 'de', petsDataMerged.length, 'da API');
        
        // Se a API não retornou meus pets, buscar individualmente (apenas do cache local)
        if (myPets.length < myPetIds.size) {
          console.log('[PetService] API não retornou todos os pets, verificando cache local...');
          const missingIds = Array.from(myPetIds).filter(id => !myPets.some(p => String(p.id) === id));
          for (const petId of missingIds) {
            // Tentar usar cache local APENAS (não fazer requisição à API)
            const localPet = this.localPets.get(String(petId));
            if (localPet) {
              myPets.push(localPet);
              console.log('[PetService] Usando pet do cache local:', petId);
            } else {
              // Se não está no cache local, verificar localStorage
              const storedPet = localStorage.getItem(`pet_${petId}`);
              if (storedPet) {
                try {
                  const pet = JSON.parse(storedPet);
                  myPets.push(pet);
                  this.localPets.set(String(petId), pet);
                  console.log('[PetService] Pet recuperado do localStorage:', petId);
                } catch (err) {
                  console.warn('[PetService] Erro ao parsear pet do localStorage:', petId);
                  // Pet não existe mais, remover do myPetIds
                  this.removeUserPetId(petId);
                }
              } else {
                // Pet não encontrado, remover do myPetIds
                console.warn('[PetService] Pet não encontrado, removendo do rastreamento:', petId);
                this.removeUserPetId(petId);
              }
            }
          }
        }
        
        const normalizedSearch = search.trim().toLowerCase();
        const filteredPets = normalizedSearch
          ? myPets.filter(p => (p.nome || '').toLowerCase().includes(normalizedSearch))
          : myPets;
        this.petsSubject.next(filteredPets);
        return {
          ...pagination,
          data: filteredPets,
          total: filteredPets.length,
          totalPages: Math.ceil(filteredPets.length / pageSize),
        };
      } catch (error: any) {
        console.warn('[PetService] Erro ao buscar pets da API:', error.response?.status, error.message);
        if (ONLINE_ONLY) {
          throw error;
        }
        // Em caso de erro (ex: autenticação), usar apenas pets locais que pertencem ao usuário
        const myPetIds = this.getUserPetIds();
        const localPets = Array.from(this.localPets.values()).filter(p => myPetIds.has(String(p.id)));
        const normalizedSearch = search.trim().toLowerCase();
        const filteredPets = normalizedSearch
          ? localPets.filter(p => (p.nome || '').toLowerCase().includes(normalizedSearch))
          : localPets;
        this.petsSubject.next(filteredPets);
        return {
          data: filteredPets,
          page,
          pageSize,
          total: filteredPets.length,
          totalPages: Math.ceil(filteredPets.length / pageSize),
        };
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async getPetById(id: string): Promise<Pet> {
    this.loadingSubject.next(true);
    try {
      // SEMPRE buscar da API primeiro para ter dados mais atualizados
      try {
        const response = await apiClient.get<Pet>(`/v1/pets/${id}`);
        console.log('[PetService] Pet carregado da API:', response.data);
        
        // Mesclar com dados locais (imagens/documentos podem estar salvos localmente)
        const localPet = this.localPets.get(id);
        const hasLocalImagens = !!localPet && Object.prototype.hasOwnProperty.call(localPet, 'imagens');
        const hasLocalDocs = !!localPet && Object.prototype.hasOwnProperty.call(localPet, 'documentos');
        const hasLocalFoto = !!localPet && Object.prototype.hasOwnProperty.call(localPet, 'foto');
        const mergedPet = {
          ...response.data,
          // Preservar `especie` do cache local se API não retornar
          especie: response.data.especie ?? localPet?.especie,
          // Quando houve alteracao local (inclusive vazio), priorizar cache local
          imagens: hasLocalImagens ? localPet?.imagens : (response.data.imagens || []),
          documentos: hasLocalDocs ? localPet?.documentos : (response.data.documentos || []),
          foto: hasLocalFoto ? localPet?.foto : response.data.foto
        };
        
        console.log('[PetService] Pet mesclado com cache:', mergedPet);
        // Atualizar mapa local com dados mesclados
        this.localPets.set(mergedPet.id.toString(), mergedPet);
        this.currentPetSubject.next(mergedPet);
        return mergedPet;
      } catch (apiError: any) {
        console.warn('[PetService] Erro ao buscar da API, tentando cache local:', apiError.response?.status);

        // Se a API responder 404, remover rastros locais para evitar novas chamadas com erro
        if (apiError.response?.status === 404) {
          const idStr = String(id);
          this.removeUserPetId(idStr);
          this.localPets.delete(idStr);
          localStorage.removeItem(`pet_${idStr}`);
          this.currentPetSubject.next(null);
          throw new Error('Pet não encontrado');
        }

        if (ONLINE_ONLY) {
          throw new Error('Erro ao buscar pet na API e modo ONLINE_ONLY está ativo');
        }

        // Fallback: verificar no mapa local
        const localPet = this.localPets.get(id);
        if (localPet) {
          console.log('[PetService] Usando pet do cache local');
          this.currentPetSubject.next(localPet);
          return localPet;
        }

        // Fallback: verificar no localStorage
        const petFromStorage = localStorage.getItem(`pet_${id}`);
        if (petFromStorage) {
          try {
            const pet: Pet = JSON.parse(petFromStorage);
            console.log('[PetService] Usando pet do localStorage');
            this.localPets.set(pet.id, pet);
            this.currentPetSubject.next(pet);
            return pet;
          } catch {}
        }

        throw new Error('Pet não encontrado');
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async createPet(pet: Omit<Pet, 'id'>): Promise<Pet> {
    this.loadingSubject.next(true);
    try {
      try {
        const response = await apiClient.post<Pet>('/v1/pets', pet);
        console.log('[PetService] Pet criado na API, ID:', response.data.id, typeof response.data.id);
        // Adicionar ID aos meus pets
        this.addUserPetId(response.data.id.toString());

        // Mesclar resposta da API com os dados enviados pelo cliente.
        // Algumas APIs não ecoam todos os campos (por ex. `especie`), então
        // garantir que campos enviados pelo usuário sejam preservados.
        const mergedPet: Pet = {
          ...response.data,
          // Priorizar campos do payload quando ausentes na resposta da API
          nome: (response.data.nome ?? pet.nome) as string,
          especie: (response.data.especie ?? (pet as any).especie) as string,
          raca: (response.data.raca ?? (pet as any).raca) as string,
          idade: (response.data.idade ?? (pet as any).idade) as number,
          tutorIds: (response.data.tutorIds ?? (pet as any).tutorIds) as string[] | undefined,
        } as Pet;

        // Armazenar no mapa local com ID do servidor
        this.localPets.set(mergedPet.id.toString(), mergedPet);
        // Persistir no localStorage para consistência com o fluxo de update
        localStorage.setItem(`pet_${mergedPet.id}`, JSON.stringify(mergedPet));
        // Adicionar o novo pet à lista
        const currentPets = this.petsSubject.getValue();
        this.petsSubject.next([...currentPets, mergedPet]);
        console.log('[PetService] Pet criado e adicionado aos meus pets:', mergedPet.id, 'myPetIds agora:', Array.from(this.getUserPetIds()));
        return mergedPet;
      } catch (error: any) {
        if (error.response?.status === 401) {
          if (!ONLINE_ONLY) {
            console.warn('Autenticação falhou, criando pet localmente');
            const newPet: Pet = {
              id: Date.now().toString(),
              ...pet,
            };
            // Adicionar ID aos meus pets
            this.addUserPetId(newPet.id);
            // Armazenar no mapa local
            this.localPets.set(newPet.id, newPet);
            // Adicionar o novo pet à lista local
            const currentPets = this.petsSubject.getValue();
            this.petsSubject.next([...currentPets, newPet]);
            return newPet;
          }
          throw error;
        }
        throw error;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async updatePet(id: string, pet: Partial<Pet>): Promise<Pet> {
    this.loadingSubject.next(true);
    try {
      // Garantir payload completo com campos obrigatórios
      let basePet = this.localPets.get(id) || this.petsSubject.getValue().find(p => String(p.id) === String(id)) || null;
      if (!basePet) {
        try {
          const fetched = await apiClient.get<Pet>(`/v1/pets/${id}`);
          basePet = fetched.data;
          this.localPets.set(id, fetched.data);
        } catch {
          // se não conseguir buscar, seguirá e o backend pode recusar se faltar campo
        }
      }
      const payload = basePet ? { ...basePet, ...pet } : pet;

      // SEMPRE salvar no cache local ANTES de tentar API (para garantir persistência)
      const updatedPetLocal = payload as Pet;
      this.localPets.set(id, updatedPetLocal);
      localStorage.setItem(`pet_${id}`, JSON.stringify(updatedPetLocal));
      console.log('[PetService] Pet salvo no cache local:', id, 'imagens:', updatedPetLocal.imagens?.length, 'docs:', updatedPetLocal.documentos?.length);

      try {
        const response = await apiClient.put<Pet>(`/v1/pets/${id}`, payload);
        
        // Mesclar resposta da API com dados locais (API pode não suportar todos os campos)
        const hasFoto = Object.prototype.hasOwnProperty.call(pet, 'foto');
        const hasImagens = Object.prototype.hasOwnProperty.call(pet, 'imagens');
        const hasDocumentos = Object.prototype.hasOwnProperty.call(pet, 'documentos');
        const mergedPet = {
          ...response.data,
          // Preservar `especie` do payload/local se API não retornar
          especie: response.data.especie ?? updatedPetLocal.especie,
          // Quando houve alteracao local (inclusive vazio), priorizar payload/local
          imagens: hasImagens
            ? updatedPetLocal.imagens
            : (response.data.imagens && response.data.imagens.length > 0
              ? response.data.imagens
              : updatedPetLocal.imagens),
          documentos: hasDocumentos
            ? updatedPetLocal.documentos
            : (response.data.documentos && response.data.documentos.length > 0
              ? response.data.documentos
              : updatedPetLocal.documentos),
          foto: hasFoto ? updatedPetLocal.foto : (response.data as any).foto
        };
        
        // Atualizar no mapa local com dados mesclados
        this.localPets.set(mergedPet.id.toString(), mergedPet);
        localStorage.setItem(`pet_${id}`, JSON.stringify(mergedPet));
        this.currentPetSubject.next(mergedPet);
        // Atualizar na lista de pets
        const currentPets = this.petsSubject.getValue();
        const updatedPets = currentPets.map(p => String(p.id) === String(id) ? mergedPet : p);
        this.petsSubject.next(updatedPets);
        console.log('[PetService] Pet atualizado com sucesso:', mergedPet);
        return mergedPet;
      } catch (error: any) {
        // Fallback local para erro 401 ou erro de rede (Network Error)
        console.warn('[PetService] Erro ao atualizar na API, mantendo cache local:', error.response?.status);
        if (!ONLINE_ONLY && (error.response?.status === 401 || error.message === 'Network Error')) {
          // Já foi salvo no cache local antes, então retorna o que está lá
          const cachedPet = this.localPets.get(id);
          if (cachedPet) {
            this.currentPetSubject.next(cachedPet);
            const currentPets = this.petsSubject.getValue();
            const updatedPets = currentPets.map(p => String(p.id) === String(id) ? cachedPet : p);
            this.petsSubject.next(updatedPets);
            console.log('[PetService] Usando pet do cache local após erro');
            return cachedPet;
          }
        }
        console.error('[PetService] Erro inesperado ao atualizar pet:', error.response?.status, error.message);
        // Retorna o pet do cache mesmo com erro (somente se offline permitido)
        const cachedPet = this.localPets.get(id);
        if (!ONLINE_ONLY && cachedPet) {
          return cachedPet;
        }
        throw error;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async deletePet(id: string): Promise<void> {
    this.loadingSubject.next(true);
    const idStr = String(id);
    
    // Remover dos meus pets PRIMEIRO, antes de qualquer operação
    this.removeUserPetId(idStr);
    this.localPets.delete(idStr);
    localStorage.removeItem(`pet_${idStr}`);
    
    try {
      try {
        await apiClient.delete(`/v1/pets/${idStr}`);
        console.log('[PetService] Pet deletado com sucesso da API');
      } catch (error: any) {
        // Se for erro de autenticação (401), erro de rede (sem response), OU 400/404 (Bad Request/Not Found), aceita como sucesso (apenas se offline permitido)
        console.warn('[PetService] Erro ao deletar na API:', error.response?.status, error.message);
        if (!ONLINE_ONLY && (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 404 || !error.response)) {
          console.warn('[PetService] Aceitando como deletado localmente');
        } else {
          // Para outros erros ou quando ONLINE_ONLY, relançar
          throw error;
        }
      }
      
      // Atualizar lista local removendo o pet
      this.currentPetSubject.next(null);
      const currentPets = this.petsSubject.getValue();
      const updatedPets = currentPets.filter(p => String(p.id) !== idStr);
      this.petsSubject.next(updatedPets);
      console.log('[PetService] Pet removido da lista. Total:', updatedPets.length);
    } catch (error: any) {
      // Mesmo em caso de erro, mantém removido localmente
      console.error('[PetService] Erro ao deletar, mas mantendo removido localmente');
      this.currentPetSubject.next(null);
      const currentPets = this.petsSubject.getValue();
      const updatedPets = currentPets.filter(p => String(p.id) !== idStr);
      this.petsSubject.next(updatedPets);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async uploadPetPhoto(petId: string, file: File): Promise<{ foto: string }> {
    const formData = new FormData();
    formData.append('foto', file);

    this.loadingSubject.next(true);
    try {
      try {
        const response = await apiClient.post<{ foto: string }>(
          `/v1/pets/${petId}/fotos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data; charset=utf-8',
            },
          }
        );
        
        let fotoUrl = (response.data as any).url || (response.data as any).foto;
        // Se vier array, pegar primeiro
        if (Array.isArray(fotoUrl) && fotoUrl.length > 0) {
          fotoUrl = fotoUrl[0];
        }
        // Se vier objeto, tentar extrair campo url/foto
        if (fotoUrl && typeof fotoUrl === 'object') {
          fotoUrl = (fotoUrl as any).url || (fotoUrl as any).foto;
        }
        
        // Se a resposta for apenas um nome de arquivo, construir URL completa
        if (fotoUrl && !fotoUrl.startsWith('http')) {
          const baseUrl = 'https://pet-manager-api.geia.vip';
          fotoUrl = `${baseUrl}/uploads/${fotoUrl}`;
        }
        
        console.log('[PetService] Upload bem-sucedido. URL:', fotoUrl);
        return { foto: fotoUrl };
      } catch (error: any) {
        console.error('[PetService] Erro no upload:', error.response?.status, error.message);
        if (error.response?.status === 401) {
          console.warn('Token expirou. Faça login novamente.');
          // Limpar tokens e redirecionar para login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        // Para erro 400 (Bad Request), tenta usar o arquivo localmente como fallback (apenas se offline permitido)
        if (!ONLINE_ONLY && error.response?.status === 400) {
          console.warn('[PetService] Erro 400 no upload, tentando fallback local');
          try {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            console.log('[PetService] Usando data URL como fallback');
            return { foto: dataUrl };
          } catch (dataUrlError) {
            console.error('[PetService] Erro ao criar data URL:', dataUrlError);
            throw new Error('Erro ao salvar foto: API não respondeu e não foi possível usar fallback local');
          }
        }
        throw error;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  clearCurrentPet(): void {
    this.currentPetSubject.next(null);
  }
}

export const petService = new PetService();
