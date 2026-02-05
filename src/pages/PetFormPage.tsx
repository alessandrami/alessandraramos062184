import React, { useState, useEffect, useRef } from "react";
import { tutorService } from "../services/tutorService";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { petService } from "../services/petService";
import { Pet, Tutor } from "../types";

export function PetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  
  const isEdit = location.pathname.includes("/edit") && !!id;

  const [formData, setFormData] = useState<{ nome: string; especie: string; raca: string; idade: string; tutorIds: string[] }>({
    nome: "",
    especie: "",
    raca: "",
    idade: "",
    tutorIds: [],
  });
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [currentPet, setCurrentPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutoresDropdown, setShowTutoresDropdown] = useState(false);
  const tutoresDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTutores() {
      try {
        console.log('[PetFormPage] Buscando tutores...');
        const res = await tutorService.getTutors();
        console.log('[PetFormPage] Tutores carregados:', res.length, res);
        setTutores(res);
      } catch (e) {
        console.error('[PetFormPage] Erro ao buscar tutores:', e);
        setTutores([]);
      }
    }
    fetchTutores();
  }, [location.pathname]);

  useEffect(() => {
    if (isEdit && id) {
      loadPetData();
    }
  }, [id, isEdit]);

  const loadPetData = async () => {
    if (!id) return;
    try {
      const pet = await petService.getPetById(id);
      setCurrentPet(pet);
      setFormData({
        nome: pet.nome,
        especie: pet.especie,
        raca: pet.raca,
        idade: String(pet.idade),
        tutorIds: pet.tutorIds || [],
      });
    } catch (err) {
      setError("Erro ao carregar dados do pet");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTutorCheckboxChange = (tutorId: string, checked: boolean) => {
    setFormData((prev) => {
      const newTutorIds = checked
        ? [...prev.tutorIds, tutorId]
        : prev.tutorIds.filter(id => id !== tutorId);
      return { ...prev, tutorIds: newTutorIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const petData: Partial<Pet> = {
        nome: formData.nome,
        especie: formData.especie,
        raca: formData.raca,
        idade: parseInt(formData.idade),
        tutorIds: formData.tutorIds,
      };

      let pet: Pet;

      if (isEdit && id) {
        pet = await petService.updatePet(id, petData);
      } else {
        pet = await petService.createPet(petData as Omit<Pet, "id">);
      }

      // Sincronizar vínculos de tutor <-> pet usando endpoints de tutor,
      // pois a API pode não aceitar `tutorIds` diretamente no PUT/POST de pets.
      try {
        const prevTutorIds = currentPet?.tutorIds || [];
        const newTutorIds = formData.tutorIds || [];

        const toAdd = newTutorIds.filter(tid => !prevTutorIds.includes(tid));
        const toRemove = prevTutorIds.filter(tid => !newTutorIds.includes(tid));

        // Linkar novos tutores
        await Promise.all(toAdd.map(tid => tutorService.linkPet(tid, String(pet.id)).catch(err => {
          console.warn('[PetFormPage] Falha ao linkar tutor', tid, '-> pet', pet.id, err);
        })));

        // Desvincular tutores removidos
        await Promise.all(toRemove.map(tid => tutorService.unlinkPet(tid, String(pet.id)).catch(err => {
          console.warn('[PetFormPage] Falha ao desvincular tutor', tid, '-> pet', pet.id, err);
        })));
      } catch (linkErr) {
        console.warn('[PetFormPage] Erro na sincronização de vínculos:', linkErr);
      }

      localStorage.setItem(`pet_${pet.id}`, JSON.stringify(pet));
      setError(null);
      navigate(`/pets/${pet.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar pet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tutoresDropdownRef.current && !tutoresDropdownRef.current.contains(event.target as Node)) {
        setShowTutoresDropdown(false);
      }
    }
    if (showTutoresDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTutoresDropdown]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {isEdit ? "Editar Pet" : "Novo Pet"}
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                value={formData.nome}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o nome do pet"
              />
            </div>

            <div>
              <label htmlFor="especie" className="block text-sm font-medium text-gray-700 mb-1">
                Espécie *
              </label>
              <select
                id="especie"
                name="especie"
                value={formData.especie}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione a espécie</option>
                <option value="Cão">Cão</option>
                <option value="Gato">Gato</option>
                <option value="Coelho">Coelho</option>
                <option value="Pássaro">Pássaro</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label htmlFor="raca" className="block text-sm font-medium text-gray-700 mb-1">
                Raça
              </label>
              <input
                id="raca"
                name="raca"
                type="text"
                value={formData.raca}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite a raça"
              />
            </div>

            <div>
              <label htmlFor="idade" className="block text-sm font-medium text-gray-700 mb-1">
                Idade (anos) *
              </label>
              <input
                id="idade"
                name="idade"
                type="number"
                value={formData.idade}
                onChange={handleInputChange}
                required
                min="0"
                max="50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div className="relative" ref={tutoresDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tutor Responsável (opcional)
              </label>
              <button
                type="button"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setShowTutoresDropdown((v) => !v)}
              >
                {formData.tutorIds.length === 0
                  ? "Selecione os tutores"
                  : tutores.filter(t => formData.tutorIds.includes(t.id)).map(t => t.nome).join(", ")}
              </button>
              {showTutoresDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {tutores.length === 0 && (
                    <span className="block px-4 py-2 text-gray-500 text-sm">Nenhum tutor cadastrado</span>
                  )}
                  {tutores.map((tutor) => (
                    <label key={tutor.id} className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer">
                      <input
                        type="checkbox"
                        value={tutor.id}
                        checked={formData.tutorIds.includes(tutor.id)}
                        onChange={e => handleTutorCheckboxChange(tutor.id, e.target.checked)}
                      />
                      <span>{tutor.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 rounded-lg transition"
              >
                {loading ? "Salvando..." : "Salvar Pet"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
