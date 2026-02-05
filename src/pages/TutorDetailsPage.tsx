import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Link2, FilePlus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { tutorService } from '../services/tutorService';
import { petService } from '../services/petService';
import { type Tutor, type Pet, type Documento } from '../types';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function TutorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [pdfs, setPdfs] = useState<{ nome: string; url: string }[]>([]);
  const [imagens, setImagens] = useState<Documento[]>([]);
  const [imagemAtualIdx, setImagemAtualIdx] = useState(0);
  const fileInputPdfRef = useRef<HTMLInputElement>(null);
  const fileInputImagemRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTutorPhotoUrl = (foto?: string | unknown) => {
    if (!foto) return null;

    const normalize = (value: unknown) => {
      if (!value) return null;
      const str = typeof value === 'string' ? value : String(value);
      if (str.startsWith('http') || str.startsWith('data:') || str.startsWith('blob:')) return str;
      if (str.startsWith('/')) return `https://pet-manager-api.geia.vip${str}`;
      return `https://pet-manager-api.geia.vip/uploads/${str}`;
    };

    if (typeof foto === 'string') {
      return normalize(foto);
    }

    const extracted = (foto as any)?.url || (foto as any)?.foto || (foto as any)?.path || '';
    return normalize(extracted);
  };

  useEffect(() => {
    loadTutorDetails();
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await petService.getPets(1, 200, '');
        if (mounted) {
          setAllPets(response.data || []);
        }
      } catch (err) {
        console.warn('[TutorDetailsPage] Falha ao carregar lista de pets:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadTutorDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const tutorData = await tutorService.getTutorById(id);
      const storedOverride = localStorage.getItem(`tutor_foto_${id}`) || '';
      const storedTutor = localStorage.getItem(`tutor_${id}`) || '';
      let fallbackFoto: string | undefined = undefined;

      if (storedOverride.trim().length > 0) {
        fallbackFoto = storedOverride.trim();
      } else if (storedTutor) {
        try {
          const parsed = JSON.parse(storedTutor) as Tutor;
          if (parsed?.foto) fallbackFoto = String(parsed.foto);
        } catch {}
      }

      const mergedFoto = tutorData.foto || fallbackFoto;
      setTutor(mergedFoto ? { ...tutorData, foto: mergedFoto } : tutorData);
      setPdfs(tutorData.documentos || []);
      setImagens(tutorData.imagens || []);
      setPhotoPreview(getTutorPhotoUrl(mergedFoto));

      // Usar petIds do tutor para buscar os pets vinculados
      if (tutorData.petIds && tutorData.petIds.length > 0) {
        const tutorPets: Pet[] = [];
        for (const petId of tutorData.petIds) {
          try {
            const pet = await petService.getPetById(petId);
            tutorPets.push(pet);
          } catch (err) {
            console.warn(`Erro ao carregar pet ${petId}:`, err);
          }
        }
        setPets(tutorPets);
      } else {
        setPets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do tutor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tutor || !window.confirm('Tem certeza que deseja deletar este tutor?')) return;

    try {
      await tutorService.deleteTutor(String(tutor.id));
      navigate('/tutores');
    } catch (err) {
      console.error('Erro ao deletar tutor:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar tutor');
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
    
    if (tutor) {
      try {
        setLoading(true);
        // Upload da imagem para a API
        const uploadResult = await tutorService.uploadTutorPhoto(tutor.id, file);
        console.log('[TutorDetailsPage] Upload result:', uploadResult);
        let fotoUrl = uploadResult.foto;
        
        // Normalizar URL se vier como objeto
        if (typeof fotoUrl !== 'string') {
          fotoUrl = (fotoUrl as any)?.url || (fotoUrl as any)?.foto || String(fotoUrl);
          console.log('[TutorDetailsPage] Foto normalizada:', fotoUrl);
        }
        
        console.log('[TutorDetailsPage] Foto URL:', fotoUrl);
        const newImagens = [...imagens, { nome: file.name, url: fotoUrl }];
        setImagens(newImagens);
        setImagemAtualIdx(newImagens.length - 1);
        input.value = "";
        setError(null);
        
        // Atualizar tutor com as novas imagens
        try {
          const updatedTutor = await tutorService.updateTutor(tutor.id, { imagens: newImagens, foto: fotoUrl });
          console.log('[TutorDetailsPage] Tutor atualizado, foto:', updatedTutor.foto);
          setTutor(updatedTutor);
          console.log('[TutorDetailsPage] Tutor atualizado com sucesso:', updatedTutor);
        } catch (updateErr) {
          console.error('[TutorDetailsPage] Erro ao atualizar tutor:', updateErr);
          // Mesmo se falhar atualizar, manter o estado local consistente
          setTutor({ ...tutor, imagens: newImagens, foto: fotoUrl });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro ao salvar imagem";
        console.error('[TutorDetailsPage] Erro ao adicionar imagem:', errorMsg);
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
    
    if (tutor) {
      const nextFoto = newImagens.length > 0 ? newImagens[0].url : undefined;
      const updatedTutor = { ...tutor, imagens: newImagens, foto: nextFoto };
      setTutor(updatedTutor);
      tutorService.updateTutor(tutor.id, { imagens: newImagens, foto: nextFoto }).catch(() => {
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

  if (!tutor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tutor não encontrado</h1>
          <Link to="/tutores" className="text-blue-500 hover:text-blue-600">
            Voltar para tutores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tutores')}
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

        <div className="space-y-6">
          {/* Galeria de Imagens */}
          <div className="mb-8">
            <div className="relative">
              {/* Foto Principal ou Imagem */}
              {imagens.length > 0 ? (
                <img
                  src={imagens[imagemAtualIdx].url}
                  alt={imagens[imagemAtualIdx].nome}
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                  onError={(e) => {
                    console.error('[TutorDetailsPage] Erro ao carregar imagem:', imagens[imagemAtualIdx].url);
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-8xl">👤</span>
                </div>
              )}

              {/* Botões de Navegação de Imagens */}
              {imagens.length > 1 && (
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
              {imagens.length > 0 && (
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
                {imagens.length === 0 ? (
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
              {imagens.length > 0 && (
                <p className="text-center text-xs text-gray-500 mt-2">
                  {imagemAtualIdx + 1} de {imagens.length}
                </p>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div>
            {/* Actions */}
            <div className="flex gap-2 mb-6">
              <Link
                to={`/tutores/${tutor.id}/edit`}
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

            {/* Tutor Information */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h1 className="text-4xl font-bold text-blue-600 mb-6">{tutor.nome}</h1>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Telefone</p>
                  <p className="text-lg text-gray-800">{tutor.telefone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Endereço</p>
                  <p className="text-lg text-gray-800">{tutor.endereco}</p>
                </div>
              </div>

              {tutor.dataCriacao && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Criado em: {new Date(tutor.dataCriacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>

            {/* Documentos do Tutor */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Documentos do Tutor</h2>

              <div className="border rounded-lg p-4 bg-blue-50 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Anexar arquivo (PDF)</label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputPdfRef}
                    type="file"
                    accept="application/pdf"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const input = fileInputPdfRef.current;
                      if (!input || !input.files || !input.files.length) return;
                      const file = input.files[0];
                      if (file.type !== 'application/pdf') {
                        setError('Apenas arquivos em PDF são permitidos.');
                        return;
                      }
                      if (!tutor) return;
                      try {
                        setLoading(true);
                        const uploadResult = await tutorService.uploadTutorDocument(String(tutor.id), file);
                        const newPdfs = [...pdfs, { nome: file.name, url: uploadResult.documento }];
                        setPdfs(newPdfs);
                        input.value = '';
                        setError(null);
                        try {
                          await tutorService.updateTutor(String(tutor.id), { documentos: newPdfs });
                        } catch (updateErr) {
                          console.warn('[TutorDetailsPage] Falha ao atualizar tutor com documentos:', updateErr);
                        }
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Erro ao salvar documento');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                  >
                    Adicionar
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Apenas arquivos em PDF.</p>
              </div>

              {pdfs.length > 0 ? (
                <ul className="space-y-3">
                  {pdfs.map((doc, idx) => (
                    <li key={`${doc.nome}-${idx}`} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800">{doc.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 font-medium">Abrir</a>
                        <button
                          type="button"
                          onClick={() => {
                            const newPdfs = pdfs.filter((_, i) => i !== idx);
                            setPdfs(newPdfs);
                            if (tutor) {
                              tutorService.updateTutor(String(tutor.id), { documentos: newPdfs }).catch(() => setError('Erro ao remover documento'));
                            }
                          }}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          Deletar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum documento anexado</p>
              )}
            </div>

            {/* Pets Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Pets Vinculados</h2>
              <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vincular novo pet</label>
                <div className="flex flex-col md:flex-row gap-2">
                  <select
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Selecione um pet</option>
                    {allPets
                      .filter((p) => !((tutor.petIds || []).map(String)).includes(String(p.id)))
                      .map((pet) => (
                        <option key={pet.id} value={String(pet.id)}>
                          {pet.nome}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedPetId}
                    onClick={async () => {
                      if (!tutor || !selectedPetId) return;
                      try {
                        setLoading(true);
                        await tutorService.linkPet(String(tutor.id), String(selectedPetId));
                        const pet = await petService.getPetById(String(selectedPetId));
                        const updatedPets = [...pets.filter(p => String(p.id) !== String(pet.id)), pet];
                        setPets(updatedPets);
                        const updatedTutor = {
                          ...tutor,
                          petIds: Array.from(new Set([...(tutor.petIds || []).map(String), String(pet.id)])),
                        } as Tutor;
                        setTutor(updatedTutor);
                        setSelectedPetId('');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Erro ao vincular pet');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                  >
                    <Link2 className="w-4 h-4" />
                    Vincular
                  </button>
                </div>
              </div>
              {pets.length > 0 ? (
                <div className="space-y-3">
                  {pets.map((pet) => (
                    <div key={pet.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      <Link to={`/pets/${pet.id}`} className="flex items-center gap-3">
                        <span className="text-2xl">🐾</span>
                        <div>
                          <p className="font-medium text-gray-800">{pet.nome}</p>
                          <p className="text-sm text-gray-600">
                            {typeof pet.especie === 'string' ? pet.especie : ((pet.especie as any)?.nome || (pet.especie as any)?.tipo || (pet.especie as any)?.label || '')} • {pet.idade} anos
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!tutor) return;
                          try {
                            setLoading(true);
                            await tutorService.unlinkPet(String(tutor.id), String(pet.id));
                            setPets(pets.filter(p => String(p.id) !== String(pet.id)));
                            const updatedTutor = {
                              ...tutor,
                              petIds: (tutor.petIds || []).map(String).filter(pid => pid !== String(pet.id)),
                            } as Tutor;
                            setTutor(updatedTutor);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Erro ao desvincular pet');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover vínculo
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Nenhum pet vinculado ainda</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
