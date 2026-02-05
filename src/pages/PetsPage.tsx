import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Sparkles } from 'lucide-react';
import { petService } from '../services/petService';
import { PetCard } from '../components/PetCard';
import { Pagination } from '../components/Pagination';
import { useObservable } from '../hooks';
import { debounce } from '../utils/formatters';

export function PetsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paginationData, setPaginationData] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });

  const pets = useObservable(petService.pets$, []);
  const loading = useObservable(petService.loading$, false);

  useEffect(() => {
    loadPets();
  }, [currentPage, search]);

  const loadPets = async () => {
    try {
      const data = await petService.getPets(currentPage, 10, search);
      setPaginationData({
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      });
    } catch (error) {
      console.error('Erro ao carregar pets:', error);
    }
  };

  const handleSearchChange = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, 500);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <Link
              to="/pets/new"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all h-fit whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Novo Pet
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome do pet..."
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-6 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all hover:border-gray-300"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total de Pets</p>
                <p className="text-4xl font-bold mt-1">{paginationData.total}</p>
              </div>
              <div className="text-6xl opacity-20">🐾</div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Carregando seus pets...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && pets.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-sm">
            <div className="text-6xl mb-4">🐕‍🦺</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhum pet registrado</h3>
            <p className="text-gray-600 mb-6">Comece adicionando seu primeiro pet</p>
            <Link
              to="/pets/new"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Adicionar Pet
            </Link>
          </div>
        )}

        {/* Pets Grid */}
        {!loading && pets && pets.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} />
              ))}
            </div>

            {/* Pagination */}
            {paginationData.totalPages > 1 && (
              <Pagination
                currentPage={paginationData.page}
                totalPages={paginationData.totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
