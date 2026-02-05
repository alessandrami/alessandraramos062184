import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Home, PawPrint, Users, LogOut, Menu, X, Activity } from 'lucide-react';
import { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import './App.css';

// Lazy load route components
const PetsPage = lazy(() => import('./pages/PetsPage').then(m => ({ default: m.PetsPage })));
const PetDetailsPage = lazy(() => import('./pages/PetDetailsPage').then(m => ({ default: m.PetDetailsPage })));
const PetFormPage = lazy(() => import('./pages/PetFormPage').then(m => ({ default: m.PetFormPage })));
const TutoresPage = lazy(() => import('./pages/TutoresPage').then(m => ({ default: m.TutoresPage })));
const TutorDetailsPage = lazy(() => import('./pages/TutorDetailsPage').then(m => ({ default: m.TutorDetailsPage })));
const TutorFormPage = lazy(() => import('./pages/TutorFormPage').then(m => ({ default: m.TutorFormPage })));
const HealthPage = lazy(() => import('./pages/HealthPage').then(m => ({ default: m.HealthPage })));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Carregando...</p>
    </div>
  </div>
);

function Header() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const headerClass = isActive('/tutores')
    ? 'bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg sticky top-0 z-40'
    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg sticky top-0 z-40';

  const mobileBorderClass = isActive('/tutores') ? 'border-purple-500' : 'border-blue-500';

  return (
    <header className={headerClass}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-white rounded-lg p-2 group-hover:scale-110 transition-transform">
              <PawPrint className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Amifa Pets</h1>
              <p className="text-xs text-blue-100">Gestão de Pets & Tutores</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/') 
                  ? 'bg-white text-blue-600 font-semibold shadow-md' 
                  : 'text-white hover:bg-blue-600'
              }`}
            >
              <Home className="w-4 h-4" />
              Pets
            </Link>
            <Link
              to="/tutores"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/tutores')
                  ? 'bg-white text-blue-600 font-semibold shadow-md'
                  : 'text-white hover:bg-blue-600'
              }`}
            >
              <Users className="w-4 h-4" />
              Tutores
            </Link>
            <Link
              to="/health"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/health')
                  ? 'bg-white text-blue-600 font-semibold shadow-md'
                  : 'text-white hover:bg-blue-600'
              }`}
            >
              <Activity className="w-4 h-4" />
              Health
            </Link>
          </nav>

          {/* Desktop Logout */}
          <div className="hidden md:block">
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white hover:bg-blue-600 p-2 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className={`md:hidden mt-4 pt-4 border-t ${mobileBorderClass} space-y-2`}>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg transition-all ${
                isActive('/') 
                  ? 'bg-white text-blue-600 font-semibold' 
                  : 'text-white hover:bg-blue-600'
              }`}
            >
              🏠 Pets
            </Link>
            <Link
              to="/tutores"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg transition-all ${
                isActive('/tutores')
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'text-white hover:bg-blue-600'
              }`}
            >
              👥 Tutores
            </Link>
            <Link
              to="/health"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg transition-all ${
                isActive('/health')
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'text-white hover:bg-blue-600'
              }`}
            >
              ❤️ Health
            </Link>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              🚪 Sair
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

function App() {
  const { loading, isAuthenticated } = useAuth();

  console.log('App Component - loading:', loading, 'isAuthenticated:', isAuthenticated);
  console.log('LocalStorage authToken:', localStorage.getItem('authToken'));

  if (loading) {
    return <LoadingFallback />;
  }

  // Se não autenticado, mostrar login ou signup
  if (!isAuthenticated) {
    console.log('Mostrando LoginPage');
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  console.log('Mostrando App Principal');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<PetsPage />} />
          <Route path="/pets/new" element={<PetFormPage />} />
          <Route path="/pets/:id/edit" element={<PetFormPage />} />
          <Route path="/pets/:id" element={<PetDetailsPage />} />
          <Route path="/tutores" element={<TutoresPage />} />
          <Route path="/tutores/new" element={<TutorFormPage />} />
          <Route path="/tutores/:id/edit" element={<TutorFormPage />} />
          <Route path="/tutores/:id" element={<TutorDetailsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
