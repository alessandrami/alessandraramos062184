import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { tutorService } from '../services/tutorService';
import { apiClient } from '../services/apiClient';
import { formatPhoneNumber, parsePhoneNumber } from '../utils/formatters';
import { Tutor, Pet } from '../types';
import { petService } from '../services/petService';

export function TutorFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState<{ nome: string; telefone: string; endereco: string; petIds: string[] }>({ nome: '', telefone: '', endereco: '', petIds: [] });
  const [pets, setPets] = useState<Pet[]>([]);
  
  const [showPetsDropdown, setShowPetsDropdown] = useState(false);
  const petsDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTutor, setCurrentTutor] = useState<Tutor | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (petsDropdownRef.current && !petsDropdownRef.current.contains(event.target as Node)) {
        setShowPetsDropdown(false);
      }
    }
    if (showPetsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPetsDropdown]);

  useEffect(() => {
    if (isEdit && id) {
      (async () => {
        try {
          const tutor = await tutorService.getTutorById(id);
          setCurrentTutor(tutor);
          setFormData({
            nome: tutor.nome,
            telefone: tutor.telefone,
            endereco: tutor.endereco,
            petIds: tutor.petIds || []
          });
        } catch {
          setError('Erro ao carregar dados do tutor');
        }
      })();
    }
  }, [id, isEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'telefone') newValue = formatPhoneNumber(value);
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handlePetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setFormData(prev => ({ ...prev, petIds: selected }));
  };

  // Load all pets from API so user can link any pet to a tutor
  useEffect(() => {
    let sub: any;
    // subscribe to petService.pets$ so if other pages update pets we reflect here
    sub = petService.pets$.subscribe(list => {
      const normalized = (list || []).map(p => ({ ...p, id: String((p as any).id) }));
      setPets(normalized as any);
    });

    // attempt to load pets tracked for the user (this respects myPetIds and local cache)
    (async () => {
      try {
        await petService.getPets(1, 200, '');
      } catch (err) {
        console.warn('[TutorFormPage] petService.getPets failed', err);
      }
    })();

    return () => sub?.unsubscribe && sub.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let tutor: Tutor | undefined = undefined;
    try {
      const tutorData: Partial<Tutor> = {
        nome: formData.nome,
        telefone: parsePhoneNumber(formData.telefone),
        endereco: formData.endereco,
        petIds: formData.petIds
      };
      try {
        if (isEdit && id) {
          tutor = await tutorService.updateTutor(id, tutorData);
        } else {
          tutor = await tutorService.createTutor(tutorData as Omit<Tutor, 'id'>);
        }
      } catch (err: any) {
        if (!tutor) {
          setError(err && err.message ? err.message : 'Erro ao salvar tutor');
        }
      }
      if (tutor && tutor.id) {
        setError(null);
        navigate(`/tutores/${tutor.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/tutores')}
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {isEdit ? 'Editar Tutor' : 'Novo Tutor'}
          </h1>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                value={formData.nome}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o nome completo"
              />
            </div>
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                value={formData.telefone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(11) 9999-9999"
              />
            </div>
            <div>
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
                Endereço *
              </label>
              <textarea
                id="endereco"
                name="endereco"
                value={formData.endereco}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o endereço completo"
              />
            </div>
            <div className="relative" ref={petsDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pets Vinculados (opcional)
              </label>
              <button
                type="button"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setShowPetsDropdown((v) => !v)}
              >
                {formData.petIds.length === 0
                  ? 'Selecione os pets'
                  : pets.filter(p => formData.petIds.includes(String(p.id))).map(p => p.nome).join(', ')}
              </button>
              {showPetsDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {pets.length === 0 && (
                    <span className="block px-4 py-2 text-gray-500 text-sm">Nenhum pet cadastrado</span>
                  )}
                  {pets.map((pet) => (
                    <label key={pet.id} className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer">
                      <input
                        type="checkbox"
                        value={String(pet.id)}
                        checked={formData.petIds.includes(String(pet.id))}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => {
                            let petIds = prev.petIds || [];
                            const idStr = String(pet.id);
                            if (checked) {
                              petIds = [...petIds, idStr];
                            } else {
                              petIds = petIds.filter(id => id !== idStr);
                            }
                            return { ...prev, petIds };
                          });
                        }}
                      />
                      <span>{pet.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Document upload removed from form; manage documents on tutor detail page */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 rounded-lg transition"
              >
                {loading ? 'Salvando...' : 'Salvar Tutor'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/tutores')}
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
