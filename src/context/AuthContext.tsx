import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Limpar tokens antigos (demo-token) na inicialização
    const authToken = localStorage.getItem('authToken');
    console.log('AuthProvider - Token atual:', authToken);
    
    // Se for um demo-token, remover
    if (authToken && authToken.startsWith('demo-token')) {
      console.log('AuthProvider - Removendo demo-token antigo');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
    } else if (authToken) {
      // Se for um token real, manter autenticado
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    
    setLoading(false);
  }, []);

  const login = async (usuario: string, password: string) => {
    setLoading(true);
    try {
      // Tentar autenticar primeiro na API oficial
      await authService.login(usuario, password);
      setIsAuthenticated(true);
    } catch (error: any) {
      // Se falhar na API oficial, permitir apenas admin/admin localmente
      if (usuario === 'admin' && password === 'admin') {
        localStorage.setItem('authToken', 'admin-token');
        setIsAuthenticated(true);
      } else {
        throw new Error('Acesso restrito: credenciais inválidas.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('AuthProvider - Fazendo logout');
    authService.logout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
