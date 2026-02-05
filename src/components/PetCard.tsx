import { type Pet } from '../types';
import { Link } from 'react-router-dom';
import { Heart, MapPin, ArrowRight } from 'lucide-react';

interface PetCardProps {
  pet: Pet;
}

export function PetCard({ pet }: PetCardProps) {
  // Prioriza imagem anexada e normaliza URL relativa para o host oficial
  const imagemExibicao = (() => {
    const primeiraImagem = pet.imagens && pet.imagens.length > 0 ? pet.imagens[0] : null;
    const baseUrl = 'https://pet-manager-api.geia.vip';

    if (primeiraImagem?.url && typeof primeiraImagem.url === 'string') {
      return primeiraImagem.url.startsWith('http') ? primeiraImagem.url : `${baseUrl}${primeiraImagem.url}`;
    }

    if (pet.foto) {
      // Se foto for string
      if (typeof pet.foto === 'string') {
        return pet.foto.startsWith('http') ? pet.foto : `${baseUrl}${pet.foto}`;
      }
      // Se foto for objeto, extrair URL
      if (typeof pet.foto === 'object') {
        const fotoUrl = ((pet.foto as any).url || (pet.foto as any).foto || '').toString();
        if (fotoUrl) {
          return fotoUrl.startsWith('http') ? fotoUrl : `${baseUrl}${fotoUrl}`;
        }
      }
    }

    return null;
  })();

  const getSpecies = () => {
    const s = pet.especie as any;
    if (!s && (pet as any).species) return (pet as any).species;
    if (!s && (pet as any).tipo) return (pet as any).tipo;
    if (!s && (pet as any).type) return (pet as any).type;
    if (typeof s === 'string') return s;
    if (typeof s === 'object') return s.nome || s.tipo || s.label || s.name || '';
    return '';
  };

  const especieDisplay = getSpecies();
  if (!especieDisplay) {
    // small dev-time hint to help diagnose missing species values
    console.debug('[PetCard] espécie ausente para pet', pet.id, pet.nome, pet);
  }

  return (
    <Link to={`/pets/${pet.id}`}>
      <div className="group h-full bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative h-56 overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100">
          {imagemExibicao ? (
            <img
              src={imagemExibicao}
              alt={pet.nome}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'absolute inset-0 flex items-center justify-center text-6xl bg-gradient-to-br from-blue-100 to-indigo-100';
                fallback.innerText = '🐾';
                target.parentNode?.appendChild(fallback);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">🐾</span>
            </div>
          )}
          {/* Removido badge de espécie */}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Name */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition">
            {pet.nome}
          </h3>

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
              <p className="text-xs text-gray-500 font-medium">Raça</p>
              <p className="text-sm font-semibold text-gray-900">{pet.raca}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-100">
              <p className="text-xs text-gray-500 font-medium">Espécie</p>
              <p className="text-sm font-semibold text-gray-900">{especieDisplay}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 border border-green-100">
              <p className="text-xs text-gray-500 font-medium">Idade</p>
              <p className="text-sm font-semibold text-gray-900">{pet.idade} anos</p>
            </div>
          </div>

          {/* Footer with Heart and Arrow */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Heart className="w-5 h-5 text-red-400 fill-red-400" />
              <span className="text-sm font-semibold text-gray-700">Detalhes</span>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}