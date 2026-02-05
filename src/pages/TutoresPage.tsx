// react hooks imported below (useState, useEffect)
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Plus, Phone, MapPin, Edit2, Eye, Sparkles, Trash2, Search, User } from 'lucide-react';
import { tutorService } from '../services/tutorService';
import { useObservable } from '../hooks';
import { type Tutor } from '../types';
import { useState, useEffect } from 'react';
import { debounce } from '../utils/formatters';

export function TutoresPage() {
  const tutores = useObservable(tutorService.tutors$, []);
  const loading = useObservable(tutorService.loading$, false);
  // Defensive source: `tutores` may be an array or a paginated object
  const rawTutorsArray = Array.isArray(tutores) ? tutores : (tutores as any).data || [];
  const [search, setSearch] = useState('');
  const [filteredTutors, setFilteredTutors] = useState<Tutor[]>(rawTutorsArray);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Show total based on source data (all tutors), not the filtered view.
  // Se por algum motivo `rawTutorsArray` estiver vazio mas `filteredTutors` tiver itens
  // (sincronização assíncrona), usar o maior entre os dois como fallback.
  const totalTutores = Math.max(rawTutorsArray.length, filteredTutors.length);
  const location = useLocation();

  useEffect(() => {
    // Logs temporários para debug do problema de contagem zerada
    console.log('[TutoresPage] rawTutorsArray.length =', rawTutorsArray.length, rawTutorsArray);
    console.log('[TutoresPage] filteredTutors.length =', filteredTutors.length, filteredTutors);
    console.log('[TutoresPage] totalTutores =', totalTutores);
  }, [rawTutorsArray, filteredTutors, totalTutores]);

  useEffect(() => {
    // Sempre recarrega a lista ao entrar na página
    let mounted = true;
    (async () => {
      try {
        await tutorService.getTutors();
      } finally {
        if (mounted) setHasLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  // Keep filtered list in sync with source and search
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFilteredTutors(rawTutorsArray as Tutor[]);
      return;
    }
    const res = (rawTutorsArray as Tutor[]).filter(t => (t.nome || '').toLowerCase().includes(q));
    setFilteredTutors(res);
  }, [rawTutorsArray, search]);

  const handleSearchChange = debounce((value: string) => {
    setSearch(value);
  }, 300);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tutor?')) {
      try {
        await tutorService.deleteTutor(String(id));
        // Força recarregar a lista após deletar
        await tutorService.getTutors();
      } catch (err) {
        console.error('Erro ao deletar tutor:', err);
        alert('Erro ao deletar tutor. Tente novamente.');
      }
    }
  };

  const getFotoOverride = (tutorId?: string | number) => {
    if (tutorId === undefined || tutorId === null) return null;
    const raw = localStorage.getItem(`tutor_foto_${tutorId}`);
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
    return trimmed;
  };

  const getTutorPhotoUrl = (foto?: string | unknown, tutorId?: string | number) => {
    const override = getFotoOverride(tutorId);
    const source = override ?? foto;
    if (!source) return null;
    const normalize = (value: unknown) => {
      if (!value) return null;
      const str = typeof value === 'string' ? value : String(value);
      if (str.startsWith('http') || str.startsWith('data:') || str.startsWith('blob:')) return str;
      if (str.startsWith('/')) return `https://pet-manager-api.geia.vip${str}`;
      return `https://pet-manager-api.geia.vip/uploads/${str}`;
    };
    if (typeof source === 'string') return normalize(source);
    const extracted = (source as any)?.url || (source as any)?.foto || (source as any)?.path || '';
    return normalize(extracted);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="w-full py-12">
        {/* Hero Section */}
        <div className="mb-12 px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <Link
              to="/tutores/new"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all h-fit whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Novo Tutor
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 px-8">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome do tutor..."
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-6 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm transition-all hover:border-gray-300"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 px-8">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total de Tutores</p>
                <p className="text-4xl font-bold mt-1">{totalTutores}</p>
              </div>
              <div className="text-6xl opacity-20">👥</div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Carregando tutores...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {/* Mostrar estado vazio apenas após a primeira tentativa de carregamento */}
        {!loading && hasLoaded && totalTutores === 0 && (
          <div className="px-8">
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-sm">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhum tutor registrado</h3>
              <p className="text-gray-600 mb-6">Comece adicionando seu primeiro tutor</p>
              <Link
                to="/tutores/new"
                className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                <Plus className="w-5 h-5" />
                Adicionar Tutor
              </Link>
            </div>
          </div>
        )}

        {/* Tutores Grid */}
        {!loading && hasLoaded && totalTutores > 0 && (
          <div className="px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTutors.map((tutor: Tutor) => {
              // Prioriza imagem anexada e normaliza URL relativa para o host oficial
              const imagemExibicao = (() => {
                const primeiraImagem = tutor.imagens && tutor.imagens.length > 0 ? tutor.imagens[0] : null;
                const baseUrl = 'https://pet-manager-api.geia.vip';

                if (primeiraImagem?.url && typeof primeiraImagem.url === 'string') {
                  return primeiraImagem.url.startsWith('http') ? primeiraImagem.url : `${baseUrl}${primeiraImagem.url}`;
                }

                if (tutor.foto) {
                  // Se foto for string
                  if (typeof tutor.foto === 'string') {
                    return tutor.foto.startsWith('http') ? tutor.foto : `${baseUrl}${tutor.foto}`;
                  }
                  // Se foto for objeto, extrair URL
                  if (typeof tutor.foto === 'object') {
                    const fotoUrl = ((tutor.foto as any).url || (tutor.foto as any).foto || '').toString();
                    if (fotoUrl) {
                      return fotoUrl.startsWith('http') ? fotoUrl : `${baseUrl}${fotoUrl}`;
                    }
                  }
                }

                return null;
              })();

              return (
                <Link key={tutor.id} to={`/tutores/${tutor.id}`} className="group h-full bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-200 hover:-translate-y-1 block">
                  {/* Image Container */}
                  <div className="relative h-56 overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100">
                    {imagemExibicao ? (
                      <img
                        src={imagemExibicao}
                        alt={tutor.nome}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'absolute inset-0 flex items-center justify-center text-6xl bg-gradient-to-br from-purple-100 to-pink-100';
                          fallback.innerText = '👤';
                          target.parentNode?.appendChild(fallback);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-purple-600 transition">
                      {tutor.nome}
                    </h3>

                    {/* Info Grid */}
                    <div className="space-y-2 mb-4">
                      {tutor.telefone && (
                        <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                          <p className="text-xs text-gray-500 font-medium">Telefone</p>
                          <p className="text-sm font-semibold text-gray-900">{tutor.telefone}</p>
                        </div>
                      )}
                      {tutor.endereco && (
                        <div className="bg-pink-50 rounded-lg p-2 border border-pink-100">
                          <p className="text-xs text-gray-500 font-medium">Endereço</p>
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{tutor.endereco}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer with Arrow */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <User className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-semibold text-gray-700">Detalhes</span>
                      </div>
                      <svg className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
