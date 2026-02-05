import { BehaviorSubject } from 'rxjs';
import { apiClient, ONLINE_ONLY } from './apiClient';
import { type Tutor } from '../types';


export class TutorService {
  private tutorsSubject = new BehaviorSubject<Tutor[]>([]);
  public tutors$ = this.tutorsSubject.asObservable();

  private currentTutorSubject = new BehaviorSubject<Tutor | null>(null);
  public currentTutor$ = this.currentTutorSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Armazenar tutores criados/atualizados localmente
  private localTutors: Map<string, Tutor> = new Map();

  private loadLocalTutors(): void {
    // 1) Carregar lista consolidada
    const localTutorsArr = JSON.parse(localStorage.getItem('tutores_local') || '[]');
    if (Array.isArray(localTutorsArr)) {
      localTutorsArr.forEach((t: Tutor) => {
        if (t && t.id) this.localTutors.set(String(t.id), t);
      });
    }

    // 2) Complementar com entradas individuais tutor_<id>
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('tutor_')) continue;
      if (key === 'tutores_local') continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const tutor = JSON.parse(raw) as Tutor;
        if (tutor && tutor.id) {
          const existing = this.localTutors.get(String(tutor.id));
          this.localTutors.set(String(tutor.id), existing ? { ...existing, ...tutor } : tutor);
        }
      } catch {}
    }

    // Persistir a versão consolidada
    this.persistLocalTutors();
  }

  private resolveFoto(apiFoto: unknown, fallback?: unknown) {
    const hasValue = (value: unknown) => {
      if (!value) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'object') {
        const extracted = (value as any)?.url || (value as any)?.foto || (value as any)?.path;
        if (typeof extracted === 'string') return extracted.trim().length > 0;
        return Boolean(extracted);
      }
      return true;
    };

    return hasValue(apiFoto) ? apiFoto : fallback;
  }

  private getFotoOverride(id: string): string | undefined {
    const stored = localStorage.getItem(`tutor_foto_${id}`);
    if (!stored) return undefined;
    const trimmed = stored.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private setFotoOverride(id: string, foto?: string) {
    if (foto && foto.trim().length > 0) {
      localStorage.setItem(`tutor_foto_${id}`, foto);
    }
  }

  private clearFotoOverride(id: string) {
    localStorage.removeItem(`tutor_foto_${id}`);
  }

  constructor() {
    // Carregar tutores locais do localStorage ao inicializar
    this.loadLocalTutors();

    // Se estamos em modo ONLINE_ONLY, remover dados locais de tutores para evitar cartões locais inválidos
    if (ONLINE_ONLY) {
      if (this.localTutors.size > 0) {
        console.log('[TutorService] ONLINE_ONLY ativo — removendo tutores locais do localStorage');
        // Remover chaves tutor_<id>
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('tutor_')) {
            localStorage.removeItem(key);
          }
        }
        localStorage.removeItem('tutores_local');
        this.localTutors.clear();
      }
    }
  }

  private persistLocalTutors() {
    localStorage.setItem('tutores_local', JSON.stringify(Array.from(this.localTutors.values())));
  }

  async getTutors(): Promise<Tutor[]> {
    this.loadingSubject.next(true);
    try {
      try {
        const response = await apiClient.get('/v1/tutores');
        // A API pode devolver: { data: Tutor[] } ou Tutor[] diretamente
        let apiTutors: Tutor[] = [];
        if (Array.isArray(response.data?.data)) {
          apiTutors = response.data.data;
        } else if (Array.isArray(response.data)) {
          apiTutors = response.data;
        } else {
          apiTutors = [];
        }

        // Se a API não trouxe dados válidos, cair para cache local
        if (!apiTutors || apiTutors.length === 0) {
          const localTutors = Array.from(this.localTutors.values());
          this.tutorsSubject.next(localTutors);
          return localTutors;
        }

        // Mesclar tutores da API com cache local (para petIds)
        const apiTutorsWithCache = apiTutors.map(tutor => {
          const localTutor = this.localTutors.get(String(tutor.id));
          const storedTutor = localStorage.getItem(`tutor_${tutor.id}`);
          let localData = localTutor;
          const fotoOverride = this.getFotoOverride(String(tutor.id));

          if (storedTutor) {
            try {
              const parsedStored = JSON.parse(storedTutor);
              localData = localData ? { ...localData, ...parsedStored } : parsedStored;
            } catch {}
          }
          
          return {
              ...tutor,
              // Se API não retornar petIds, usar do cache local
              petIds: tutor.petIds && tutor.petIds.length > 0 
                ? tutor.petIds 
                : (localData?.petIds || []),
              // Preservar documentos e foto do cache local se API não retornar
              documentos: tutor.documentos && tutor.documentos.length > 0
                ? tutor.documentos
                : (localData?.documentos || []),
              // Priorizar foto local (mesma logica usada em pets)
              foto: this.resolveFoto(fotoOverride ?? localData?.foto, tutor.foto),
            };
        });
        
        // Adicionar tutores locais que não estão na API (somente se offline permitido)
        const apiTutorIds = new Set(apiTutors.map(t => String(t.id)));
        const localOnlyTutors = Array.from(this.localTutors.values()).filter(t => !apiTutorIds.has(String(t.id)));
        const allTutors = ONLINE_ONLY ? apiTutorsWithCache : [...apiTutorsWithCache, ...localOnlyTutors];
        console.log('[TutorService] Tutores da API:', apiTutors.length, 'tutores mesclados:', allTutors.length);
        this.tutorsSubject.next(allTutors);
        return allTutors;
      } catch (error: any) {
        console.warn('Erro ao buscar tutores da API:', error.response?.status, error.message);
        if (ONLINE_ONLY) {
          throw error;
        }
        // Em caso de erro, usar apenas tutores locais
        const localTutors = Array.from(this.localTutors.values());
        this.tutorsSubject.next(localTutors);
        return localTutors;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async getTutorById(id: string): Promise<Tutor> {
    this.loadingSubject.next(true);
    try {
      // SEMPRE buscar da API primeiro para ter dados mais atualizados
      try {
        const response = await apiClient.get<Tutor>(`/v1/tutores/${id}`);
        console.log('[TutorService] Tutor carregado da API:', response.data);
        
        // Mesclar com dados locais (petIds podem estar salvos localmente)
        const localTutor = this.localTutors.get(String(id));
        const storedTutor = localStorage.getItem(`tutor_${id}`);
        let localData = localTutor;

        if (storedTutor) {
          try {
            const parsedStored = JSON.parse(storedTutor);
            localData = localData ? { ...localData, ...parsedStored } : parsedStored;
          } catch {}
        }
        
        const fotoOverride = this.getFotoOverride(String(id));
        const mergedTutor = {
          ...response.data,
          // Se API não retornar petIds, usar do cache local
          petIds: response.data.petIds && response.data.petIds.length > 0 
            ? response.data.petIds 
            : (localData?.petIds || []),
          // Preservar documentos e foto do cache local se API não retornar
          documentos: response.data.documentos && response.data.documentos.length > 0
            ? response.data.documentos
            : (localData?.documentos || []),
          // Priorizar foto local (mesma logica usada em pets)
          foto: this.resolveFoto(fotoOverride ?? localData?.foto, response.data.foto),
        };
        
        console.log('[TutorService] Tutor mesclado:', mergedTutor, 'petIds:', mergedTutor.petIds?.length);
        // Armazenar no mapa local após buscar da API
        this.localTutors.set(String(mergedTutor.id), mergedTutor);
        localStorage.setItem(`tutor_${id}`, JSON.stringify(mergedTutor));
        this.currentTutorSubject.next(mergedTutor);
        return mergedTutor;
      } catch (error) {
        console.warn('[TutorService] Erro ao buscar da API, tentando cache local');
        if (ONLINE_ONLY) {
          throw new Error('Tutor não encontrado (modo ONLINE_ONLY)');
        }
        // Fallback: cache local
        const localTutor = this.localTutors.get(String(id));
        if (localTutor) {
          this.currentTutorSubject.next(localTutor);
          return localTutor;
        }
        
        // Fallback: localStorage
        const storedTutor = localStorage.getItem(`tutor_${id}`);
        if (storedTutor) {
          try {
            const tutor = JSON.parse(storedTutor);
            this.localTutors.set(id, tutor);
            this.currentTutorSubject.next(tutor);
            return tutor;
          } catch {}
        }
        
        throw new Error('Tutor não encontrado');
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async createTutor(tutor: Omit<Tutor, 'id'>): Promise<Tutor> {
    this.loadingSubject.next(true);
    try {
      try {
        const response = await apiClient.post<Tutor>('/v1/tutores', tutor);
        // Garantir que petIds enviados sejam preservados (API pode não devolver)
        const createdTutor: Tutor = {
          ...response.data,
          petIds: tutor.petIds || response.data.petIds || [],
        } as Tutor;

        // Armazenar no mapa local e localStorage
        this.localTutors.set(createdTutor.id.toString(), createdTutor);
        this.persistLocalTutors();
        localStorage.setItem(`tutor_${createdTutor.id}`, JSON.stringify(createdTutor));

        // Adicionar o novo tutor à lista
        const currentTutors = Array.isArray(this.tutorsSubject.getValue()) ? this.tutorsSubject.getValue() : [];
        this.tutorsSubject.next([...currentTutors, createdTutor]);
        return createdTutor;
      } catch (error: any) {
        // Se for erro de autenticação OU erro de rede (sem response), salva localmente (apenas se offline permitido)
        if (!ONLINE_ONLY && (error.response?.status === 401 || !error.response)) {
          console.warn('API indisponível ou autenticação falhou, criando tutor localmente');
          const newTutor: Tutor = {
            id: Date.now().toString(),
            ...tutor,
            petIds: tutor.petIds || [],
          };
          // Armazenar no mapa local
          this.localTutors.set(newTutor.id, newTutor);
          this.persistLocalTutors();
          localStorage.setItem(`tutor_${newTutor.id}`, JSON.stringify(newTutor));
          // Adicionar o novo tutor à lista local
          const currentTutors = this.tutorsSubject.getValue();
          this.tutorsSubject.next([...currentTutors, newTutor]);
          return newTutor;
        }
        throw error;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async updateTutor(id: string, tutor: Partial<Tutor>): Promise<Tutor> {
    this.loadingSubject.next(true);
    try {
      // Garantir payload completo
      let baseTutor = this.localTutors.get(String(id)) || this.tutorsSubject.getValue().find(t => String(t.id) === String(id)) || null;
      if (!baseTutor) {
        const storedTutor = localStorage.getItem(`tutor_${id}`);
        if (storedTutor) {
          try {
            baseTutor = JSON.parse(storedTutor) as Tutor;
            this.localTutors.set(String(id), baseTutor);
          } catch {}
        }
      }
      if (!baseTutor) {
        baseTutor = this.currentTutorSubject.getValue();
      }
      if (!baseTutor) {
        try {
          const fetched = await apiClient.get<Tutor>(`/v1/tutores/${id}`);
          baseTutor = fetched.data;
          this.localTutors.set(String(id), fetched.data);
        } catch {}
      }

      const payload = baseTutor ? { ...baseTutor, ...tutor } : tutor;

      // Preservar campos quando o payload parcial nao os inclui
      if (baseTutor) {
        const hasFoto = Object.prototype.hasOwnProperty.call(tutor, 'foto');
        const hasDocumentos = Object.prototype.hasOwnProperty.call(tutor, 'documentos');
        const hasPetIds = Object.prototype.hasOwnProperty.call(tutor, 'petIds');

        if (!hasFoto) payload.foto = baseTutor.foto;
        if (!hasDocumentos) payload.documentos = baseTutor.documentos;
        if (!hasPetIds) payload.petIds = baseTutor.petIds;
      }
      
      // SEMPRE salvar no cache local ANTES de tentar API
      const updatedTutorLocal = payload as Tutor;
      this.localTutors.set(String(id), updatedTutorLocal);
      localStorage.setItem(`tutor_${id}`, JSON.stringify(updatedTutorLocal));
      this.persistLocalTutors();
      console.log('[TutorService] Tutor salvo no cache local:', id, 'petIds:', updatedTutorLocal.petIds?.length);

      // Atualizar override de foto quando o payload inclui o campo foto
      if (Object.prototype.hasOwnProperty.call(tutor, 'foto')) {
        const fotoValue = (tutor as any).foto as string | undefined | null;
        if (fotoValue && String(fotoValue).trim().length > 0) {
          this.setFotoOverride(String(id), String(fotoValue));
        } else {
          this.clearFotoOverride(String(id));
        }
      }
      
      try {
        const response = await apiClient.put<Tutor>(`/v1/tutores/${id}`, payload);
        
        // Mesclar resposta da API com dados locais
        const fotoOverride = this.getFotoOverride(String(id));
        const mergedTutor = {
          ...response.data,
          // Preservar petIds do cache local se API não retornar
          petIds: response.data.petIds && response.data.petIds.length > 0 
            ? response.data.petIds 
            : updatedTutorLocal.petIds,
          // Preservar foto e documentos do cache local caso a API não retorne
          // Priorizar foto local (mesma logica usada em pets)
          foto: this.resolveFoto(fotoOverride ?? updatedTutorLocal.foto, response.data.foto),
          documentos: response.data.documentos && response.data.documentos.length > 0
            ? response.data.documentos
            : updatedTutorLocal.documentos,
        };
        
        // Atualizar no mapa local com dados mesclados
        this.localTutors.set(String(mergedTutor.id), mergedTutor);
        localStorage.setItem(`tutor_${id}`, JSON.stringify(mergedTutor));
        this.persistLocalTutors();
        this.currentTutorSubject.next(mergedTutor);
        // Atualizar na lista de tutores
        const currentTutors = this.tutorsSubject.getValue();
        const updatedTutors = currentTutors.map(t => String(t.id) === String(id) ? mergedTutor : t);
        this.tutorsSubject.next(updatedTutors);
        console.log('[TutorService] Tutor atualizado com sucesso:', mergedTutor);
        return mergedTutor;
      } catch (error: any) {
        console.warn('[TutorService] Erro ao atualizar na API, mantendo cache local:', error.response?.status);
        if (!ONLINE_ONLY) {
          // Já foi salvo no cache local antes, então retorna o que está lá
          const cachedTutor = this.localTutors.get(String(id));
          if (cachedTutor) {
            this.currentTutorSubject.next(cachedTutor);
            const currentTutors = this.tutorsSubject.getValue();
            const updatedTutors = currentTutors.map(t => String(t.id) === String(id) ? cachedTutor : t);
            this.tutorsSubject.next(updatedTutors);
            console.log('[TutorService] Usando tutor do cache local após erro');
            return cachedTutor;
          }
        }
        throw error;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async deleteTutor(id: string): Promise<void> {
    this.loadingSubject.next(true);
    try {
      try {
        await apiClient.delete(`/v1/tutores/${id}`);
        console.log('[TutorService] Tutor deletado com sucesso da API');
      } catch (error: any) {
        // Log detalhado do erro
        console.warn('[TutorService] Erro ao deletar tutor:', error.response?.status, error.message);
        // Se for erro de autenticação (401), erro de rede (sem response) OU 404 (não encontrado), exclui localmente (apenas se offline permitido)
        // Também tratar 400 (Bad Request) como fallback local
        if (!ONLINE_ONLY && (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 404 || !error.response)) {
          console.warn('[TutorService] Deletando tutor localmente como fallback');
        } else {
          // Para outros erros ou quando ONLINE_ONLY, relançar
          throw error;
        }
      }
      
      // Remover do mapa local
      this.localTutors.delete(String(id));
      this.persistLocalTutors();
      
      // Remover do localStorage individual
      localStorage.removeItem(`tutor_${id}`);
      this.clearFotoOverride(String(id));
      
      // Limpar tutor atual se for o mesmo
      if (this.currentTutorSubject.getValue()?.id === id) {
        this.currentTutorSubject.next(null);
      }
      
      // Atualizar lista de tutores removendo o tutor deletado
      const currentTutors = this.tutorsSubject.getValue();
      const updatedTutors = currentTutors.filter(t => String(t.id) !== String(id));
      this.tutorsSubject.next(updatedTutors);
      
      console.log('[TutorService] Tutor removido localmente:', id);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async uploadTutorPhoto(tutorId: string, file: File): Promise<{ foto: string }> {
    const formData = new FormData();
    formData.append('foto', file);

    this.loadingSubject.next(true);
    try {
      try {
        const response = await apiClient.post<{ foto: string }>(
          `/v1/tutores/${tutorId}/fotos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data; charset=utf-8',
            },
            timeout: 30000,
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
        if (fotoUrl && typeof fotoUrl === 'string' && !fotoUrl.startsWith('http')) {
          const baseUrl = 'https://pet-manager-api.geia.vip';
          fotoUrl = fotoUrl.startsWith('/') ? `${baseUrl}${fotoUrl}` : `${baseUrl}/uploads/${fotoUrl}`;
        }
        
        // Atualizar cache local para preservar a foto mesmo se a API nao persistir
        try {
          const idStr = String(tutorId);
          let tutor = this.localTutors.get(idStr);
          if (!tutor) {
            const stored = localStorage.getItem(`tutor_${idStr}`);
            if (stored) tutor = JSON.parse(stored);
          }
          if (fotoUrl) {
            this.setFotoOverride(String(tutorId), fotoUrl);
            const updated = (tutor ? { ...tutor, foto: fotoUrl } : { id: idStr, foto: fotoUrl }) as Tutor;
            this.localTutors.set(idStr, updated);
            this.persistLocalTutors();
            localStorage.setItem(`tutor_${idStr}`, JSON.stringify(updated));
            if (this.currentTutorSubject.getValue()?.id === idStr) {
              this.currentTutorSubject.next(updated);
            }
            const currentTutors = this.tutorsSubject.getValue();
            const updatedTutors = currentTutors.map(t => String(t.id) === idStr ? { ...t, foto: fotoUrl } : t);
            this.tutorsSubject.next(updatedTutors);
          }
        } catch (cacheErr) {
          console.warn('[TutorService] Erro ao atualizar cache local apos upload de foto:', cacheErr);
        }

        console.log('[TutorService] Upload bem-sucedido. URL:', fotoUrl);
        return { foto: fotoUrl };
      } catch (error: any) {
        console.error('[TutorService] Erro no upload:', error.response?.status, error.message);
        if (error.response?.status === 401) {
          console.warn('Token expirou. Faça login novamente.');
          // Limpar tokens e redirecionar para login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          // Permitir fallback local se offline permitido
          if (!ONLINE_ONLY) {
            console.warn('[TutorService] 401 no upload, usando fallback local');
            try {
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              return { foto: dataUrl };
            } catch (dataUrlError) {
              console.error('[TutorService] Erro ao criar data URL:', dataUrlError);
            }
          }
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        // Para erro 400 ou erro de rede, tenta usar o arquivo localmente como fallback (apenas se offline permitido)
        if (!ONLINE_ONLY && (error.response?.status === 400 || !error.response || error.message === 'Network Error')) {
          console.warn('[TutorService] Erro no upload, tentando fallback local');
          try {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            return { foto: dataUrl };
          } catch (dataUrlError) {
            console.error('[TutorService] Erro ao criar data URL:', dataUrlError);
            throw new Error('Erro ao salvar foto: API não respondeu e não foi possível usar fallback local');
          }
        }
        throw error;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async uploadTutorDocument(tutorId: string, file: File): Promise<{ documento: string }> {
    const endpoints = [
      `/v1/tutores/${tutorId}/fotos`,
      `/v1/tutores/${tutorId}/documentos`,
      `/v1/tutores/${tutorId}/docs`,
      `/v1/tutores/${tutorId}/documento`,
      `/v1/tutores/${tutorId}/arquivos`,
    ];
    const fieldNames = ['foto', 'documento', 'file', 'arquivo', 'doc'];

    this.loadingSubject.next(true);
    let lastError: any = null;
    try {
      for (const endpoint of endpoints) {
        for (const fieldName of fieldNames) {
          const formData = new FormData();
          formData.append(fieldName, file);
          try {
            console.log('[TutorService] Tentando upload', endpoint, 'campo', fieldName);
            const response = await apiClient.post<any>(endpoint, formData, {
              headers: { 'Content-Type': 'multipart/form-data; charset=utf-8' },
            });

            // Extrair URL/identificador retornado de forma robusta
            let docUrl = response.data?.url || response.data?.documento || response.data?.file || response.data;
            if (Array.isArray(docUrl) && docUrl.length > 0) docUrl = docUrl[0];
            if (typeof docUrl === 'object') docUrl = docUrl?.url || docUrl?.documento || docUrl?.file || JSON.stringify(docUrl);
            if (docUrl && typeof docUrl === 'string' && !docUrl.startsWith('http')) {
              const baseUrl = 'https://pet-manager-api.geia.vip';
              docUrl = `${baseUrl}/uploads/${docUrl}`;
            }

            // Atualizar cache local: anexar documento ao tutor se existir
            try {
              const idStr = String(tutorId);
              let tutor = this.localTutors.get(idStr);
              if (!tutor) {
                const stored = localStorage.getItem(`tutor_${idStr}`);
                if (stored) tutor = JSON.parse(stored);
              }
              if (tutor) {
                const documentos = Array.isArray(tutor.documentos) ? tutor.documentos.slice() : [];
                documentos.push({ nome: file.name, url: docUrl });
                tutor.documentos = documentos;
                this.localTutors.set(idStr, tutor);
                this.persistLocalTutors();
                localStorage.setItem(`tutor_${idStr}`, JSON.stringify(tutor));
                if (this.currentTutorSubject.getValue()?.id === idStr) {
                  this.currentTutorSubject.next(tutor);
                }
                // Atualizar lista geral
                const currentTutors = this.tutorsSubject.getValue();
                const updatedTutors = currentTutors.map(t => String(t.id) === idStr ? tutor : t);
                this.tutorsSubject.next(updatedTutors);
              }
            } catch (cacheErr) {
              console.warn('[TutorService] Erro ao atualizar cache local após upload de documento:', cacheErr);
            }

            return { documento: docUrl };
          } catch (err: any) {
            lastError = err;
            // Se 404, tentar próxima combinação; se 401, tratar como sessão expirada
            if (err.response?.status === 401) {
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
              throw new Error('Sessão expirada. Por favor, faça login novamente.');
            }
            // Caso erro 404, apenas log e continuar tentando
            console.warn('[TutorService] Falha no upload em', endpoint, 'campo', fieldName, err.response?.status);
          }
        }
      }

      // Se chegou aqui, todas as tentativas falharam
      console.error('[TutorService] Todas as rotas de upload de documento falharam');
      if (lastError) throw lastError;
      throw new Error('Erro desconhecido ao enviar documento');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  clearCurrentTutor(): void {
    this.currentTutorSubject.next(null);
  }

  async linkPet(tutorId: string, petId: string): Promise<void> {
    try {
      await apiClient.post(`/v1/tutores/${tutorId}/pets/${petId}`);
    } finally {
      // Atualizar cache local para refletir vínculo imediatamente (se existir)
      try {
        const idStr = String(tutorId);
        let tutor = this.localTutors.get(idStr);
        if (!tutor) {
          const stored = localStorage.getItem(`tutor_${idStr}`);
          if (stored) {
            tutor = JSON.parse(stored);
          }
        }
        if (tutor) {
          const petIds = Array.isArray(tutor.petIds) ? tutor.petIds.map(String) : [];
          if (!petIds.includes(String(petId))) {
            petIds.push(String(petId));
            tutor.petIds = petIds;
            this.localTutors.set(idStr, tutor);
            this.persistLocalTutors();
            localStorage.setItem(`tutor_${idStr}`, JSON.stringify(tutor));
            if (this.currentTutorSubject.getValue()?.id === idStr) {
              this.currentTutorSubject.next(tutor);
            }
          }
        }
      } catch (cacheErr) {
        console.warn('[TutorService] Erro ao atualizar cache local após linkPet:', cacheErr);
      }
    }
  }

  async unlinkPet(tutorId: string, petId: string): Promise<void> {
    try {
      await apiClient.delete(`/v1/tutores/${tutorId}/pets/${petId}`);
    } finally {
      // Atualizar cache local para refletir desvínculo imediatamente (se existir)
      try {
        const idStr = String(tutorId);
        let tutor = this.localTutors.get(idStr);
        if (!tutor) {
          const stored = localStorage.getItem(`tutor_${idStr}`);
          if (stored) {
            tutor = JSON.parse(stored);
          }
        }
        if (tutor && Array.isArray(tutor.petIds)) {
          const petIds = tutor.petIds.map(String).filter(pid => pid !== String(petId));
          tutor.petIds = petIds;
          this.localTutors.set(idStr, tutor);
          this.persistLocalTutors();
          localStorage.setItem(`tutor_${idStr}`, JSON.stringify(tutor));
          if (this.currentTutorSubject.getValue()?.id === idStr) {
            this.currentTutorSubject.next(tutor);
          }
        }
      } catch (cacheErr) {
        console.warn('[TutorService] Erro ao atualizar cache local após unlinkPet:', cacheErr);
      }
    }
  }
}

export const tutorService = new TutorService();
