import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, FilePlus, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { petService } from '../services/petService';
import { tutorService } from '../services/tutorService';
import { type Pet, type Tutor, type Documento } from '../types';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function PetDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [pet, setPet] = useState<Pet | null>(null);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagens, setImagens] = useState<Documento[]>([]);
  const [imagemAtualIdx, setImagemAtualIdx] = useState(0);
  const fileInputImagemRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sempre recarregar ao entrar na página (mesmo que seja o mesmo ID)
    loadPetDetails();
  }, [id, location.pathname]);

  const loadPetDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      console.log('[PetDetailsPage] Carregando pet:', id);
      const petData = await petService.getPetById(id);
      console.log('[PetDetailsPage] Pet carregado:', petData);
      setPet(petData);
      setImagens(petData.imagens || []);
      console.log('[PetDetailsPage] Imagens:', petData.imagens?.length || 0);
      // Suportar diferentes formatos que a API pode devolver:
      // - petData.tutorIds: array de ids
      // - petData.tutorId: id único
      // - petData.tutor: objeto tutor embutido
      // - petData.tutores: array de objetos tutor embutidos
      const tutorsFromResponse: Tutor[] = [];

      if (Array.isArray(petData.tutorIds) && petData.tutorIds.length > 0) {
        // Buscar todos os tutores em paralelo e aceitar apenas os que resolverem
        const results = await Promise.allSettled(petData.tutorIds.map((tid: string) => tutorService.getTutorById(tid)));
        for (const r of results) {
          if (r.status === 'fulfilled') tutorsFromResponse.push(r.value as Tutor);
          else console.warn('[PetDetailsPage] Falha ao carregar tutor por id (parallel):', r.reason);
        }
      } else if ((petData as any).tutorId) {
        try {
          const t = await tutorService.getTutorById(String((petData as any).tutorId));
          tutorsFromResponse.push(t);
        } catch (err) {
          console.warn('[PetDetailsPage] Falha ao carregar tutor id', (petData as any).tutorId, err);
        }
      } else if ((petData as any).tutor && typeof (petData as any).tutor === 'object') {
        tutorsFromResponse.push((petData as any).tutor as Tutor);
      } else if (Array.isArray((petData as any).tutores) && (petData as any).tutores.length > 0) {
        // API pode retornar tutores embutidos
        for (const t of (petData as any).tutores) {
          tutorsFromResponse.push(t as Tutor);
        }
      }

      // Sempre tentar complementar com relação inversa (tutor.petIds)
      // para cobrir casos em que o pet não mantém todos os vínculos.
      try {
        const allTutors = await tutorService.getTutors();
        const linked = allTutors.filter(t => Array.isArray(t.petIds) && t.petIds.map(String).includes(String(petData.id)));
        const mergedById = new Map<string, Tutor>();
        for (const t of tutorsFromResponse) mergedById.set(String(t.id), t);
        for (const t of linked) mergedById.set(String(t.id), t);
        const merged = Array.from(mergedById.values());
        if (merged.length > 0) {
          console.log('[PetDetailsPage] Tutores encontrados (merge):', merged.length);
          setTutores(merged);
        } else {
          setTutores([]);
        }
      } catch (err) {
        console.warn('[PetDetailsPage] Falha ao buscar tutores (relação inversa):', err);
        setTutores(tutorsFromResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do pet');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pet || !window.confirm('Tem certeza que deseja deletar este pet?')) return;

    try {
      await petService.deletePet(pet.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar pet');
    }
  };

  

  async function handleAddImagem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const input = fileInputImagemRef.current;
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setError("Apenas arquivos JPEG e PNG são permitidos.");
      return;
    }
    
    if (pet) {
      try {
        setLoading(true);
        // Upload da imagem para a API
        const uploadResult = await petService.uploadPetPhoto(pet.id, file);
        console.log('[PetDetailsPage] Upload result:', uploadResult);
        let fotoUrl = uploadResult.foto;
        
        // Normalizar URL se vier como objeto
        if (typeof fotoUrl !== 'string') {
          fotoUrl = (fotoUrl as any)?.url || (fotoUrl as any)?.foto || String(fotoUrl);
          console.log('[PetDetailsPage] Foto normalizada:', fotoUrl);
        }
        
        console.log('[PetDetailsPage] Foto URL:', fotoUrl);
        const newImagens = [...imagens, { nome: file.name, url: fotoUrl }];
        setImagens(newImagens);
        setImagemAtualIdx(newImagens.length - 1);
        input.value = "";
        setError(null);
        
        // Atualizar pet com as novas imagens
        try {
          const updatedPet = await petService.updatePet(pet.id, { imagens: newImagens, foto: fotoUrl });
          console.log('[PetDetailsPage] Pet atualizado, foto:', updatedPet.foto);
          setPet(updatedPet);
          console.log('[PetDetailsPage] Pet atualizado com sucesso:', updatedPet);
        } catch (updateErr) {
          console.error('[PetDetailsPage] Erro ao atualizar pet:', updateErr);
          // Mesmo se falhar atualizar, manter o estado local consistente
          setPet({ ...pet, imagens: newImagens, foto: fotoUrl });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro ao salvar imagem";
        console.error('[PetDetailsPage] Erro ao adicionar imagem:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  }

  

  function handleRemoveImagem(index: number) {
    const newImagens = imagens.filter((_, i) => i !== index);
    setImagens(newImagens);
    
    if (imagemAtualIdx >= newImagens.length && newImagens.length > 0) {
      setImagemAtualIdx(newImagens.length - 1);
    }
    if (newImagens.length === 0) {
      setImagemAtualIdx(0);
    }
    
    if (pet) {
      const nextFoto = newImagens.length > 0 ? newImagens[0].url : undefined;
      const updatedPet = { ...pet, imagens: newImagens, foto: nextFoto };
      setPet(updatedPet);
      petService.updatePet(pet.id, { imagens: newImagens, foto: nextFoto }).catch(() => {
        setError("Erro ao remover imagem");
      });
    }
  }

  

  function proximaImagem() {
    if (imagens.length > 0) {
      setImagemAtualIdx((prev) => (prev + 1) % imagens.length);
    }
  }

  function imagemAnterior() {
    if (imagens.length > 0) {
      setImagemAtualIdx((prev) => (prev - 1 + imagens.length) % imagens.length);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Pet não encontrado</h1>
          <Link to="/" className="text-blue-500 hover:text-blue-600">
            Voltar para home
          </Link>
        </div>
      </div>
    );
  }

  const temImagens = imagens.length > 0;
  const imagemAtual = temImagens ? imagens[imagemAtualIdx] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Photo Section */}
        <div className="mb-8">
          <div className="relative">
            {/* Foto Principal ou Imagem */}
            {imagemAtual ? (
              <img
                src={imagemAtual.url}
                alt={imagemAtual.nome}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('[PetDetailsPage] Erro ao carregar imagem:', imagemAtual.url);
                  (e.currentTarget as HTMLImageElement).src = '🐾';
                }}
              />
            ) : pet.foto && typeof pet.foto === 'string' ? (
              <img
                src={pet.foto.startsWith('http') ? pet.foto : `https://pet-manager-api.geia.vip${pet.foto}`}
                alt={pet.nome}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('[PetDetailsPage] Erro ao carregar foto do pet:', pet.foto);
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : pet.foto && typeof pet.foto === 'object' ? (
              // Se foto vir como objeto, extrair URL
              <img
                src={((pet.foto as any).url || (pet.foto as any).foto || '').toString()}
                alt={pet.nome}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('[PetDetailsPage] Erro ao carregar foto (objeto):', pet.foto);
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-8xl">🐾</span>
              </div>
            )}

            {/* Botões de Navegação de Imagens */}
            {temImagens && imagens.length > 1 && (
              <>
                <button
                  onClick={imagemAnterior}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={proximaImagem}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Indicador de Imagens */}
            {temImagens && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {imagens.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagemAtualIdx(idx)}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === imagemAtualIdx ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Upload de Imagem */}
            <div className="mt-4 space-y-2">
              {!temImagens ? (
                // Quando NÃO tem imagem
                <div className="flex gap-2">
                  <input
                    ref={fileInputImagemRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddImagem}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                  >
                    <FilePlus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
              ) : (
                // Quando TEM imagem
                <button
                  type="button"
                  onClick={() => handleRemoveImagem(imagemAtualIdx)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Imagem Atual
                </button>
              )}
            </div>

            {/* Contador de Imagens */}
            {temImagens && (
              <p className="text-center text-xs text-gray-500 mt-2">
                {imagemAtualIdx + 1} de {imagens.length}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <Link
            to={`/pets/${pet.id}/edit`}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
          >
            <Edit className="w-5 h-5" />
            Editar
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
          >
            <Trash2 className="w-5 h-5" />
            Deletar
          </button>
        </div>

        {/* Pet Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-4xl font-bold text-blue-600 mb-6">{pet.nome}</h1>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 font-medium">Espécie</p>
              <p className="text-lg text-gray-800">{typeof pet.especie === 'string' ? pet.especie : ((pet.especie as any)?.nome || (pet.especie as any)?.tipo || (pet.especie as any)?.label || '')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Raça</p>
              <p className="text-lg text-gray-800">{pet.raca || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Idade</p>
              <p className="text-lg text-gray-800">{pet.idade} anos</p>
            </div>
          </div>

          {pet.dataCriacao && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Criado em: {new Date(pet.dataCriacao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>

        {/* Documentos removidos para pets (apenas tutores mantêm documentos) */}

        {/* Tutor Information */}
        {tutores.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tutor{tutores.length > 1 ? 'es' : ''}</h2>
            {tutores.length > 0 ? (
              <div className="space-y-3">
                {tutores.map((tutor) => (
                  <Link
                    key={tutor.id}
                    to={`/tutores/${tutor.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-800">{tutor.nome}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Nenhum tutor vinculado</p>
            )}
          </div>
        )}
      </div>

      {/* PDF viewer removed for pets */}
    </div>
  );
}