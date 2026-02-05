import { BehaviorSubject } from 'rxjs';
import { apiClient, ONLINE_ONLY } from './apiClient';
import { type AuthResponse } from '../types';

export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem('authToken');
    this.isAuthenticatedSubject.next(!!token);
  }

  async login(usuario: string, senha: string): Promise<AuthResponse> {
    try {
      // API oficial espera username/password (vide Swagger)
      const response = await apiClient.post<AuthResponse>(
        '/autenticacao/login',
        { username: usuario, password: senha }
      );

      const token = (response.data as any).token || (response.data as any).access_token;
      const refreshToken = (response.data as any).refreshToken || (response.data as any).refresh_token;

      if (!token) {
        throw new Error('Token não retornado pela API');
      }

      localStorage.setItem('authToken', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      this.isAuthenticatedSubject.next(true);

      return { token, refreshToken: refreshToken ?? '' };
    } catch (error: any) {
      console.warn('Erro ao autenticar na API oficial:', error.response?.status, error.message);
      // Fallback local apenas quando o modo offline for permitido
      if (!ONLINE_ONLY && usuario === 'admin' && senha === 'admin') {
        const mockToken = 'admin-token-' + Date.now();
        localStorage.setItem('authToken', mockToken);
        localStorage.setItem('refreshToken', mockToken);
        this.isAuthenticatedSubject.next(true);
        return { token: mockToken, refreshToken: mockToken };
      }
      throw new Error('Credenciais inválidas');
    }
  }

  async signup(userData: { nome: string; email: string; password: string }): Promise<AuthResponse> {
    try {
      // Tentar /usuarios primeiro (endpoint mais comum para cadastro)
      const response = await apiClient.post<AuthResponse>(
        '/usuarios',
        userData
      );

      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      this.isAuthenticatedSubject.next(true);

      return response.data;
    } catch (error: any) {
      console.error('Erro no primeiro endpoint /usuarios:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data
      });

      // Se falhar, tentar alternativas
      if (error.response?.status === 404 || error.response?.data?.message?.includes('matching target')) {
        try {
          const response = await apiClient.post<AuthResponse>(
            '/autenticacao/registrar',
            userData
          );

          localStorage.setItem('authToken', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          this.isAuthenticatedSubject.next(true);

          return response.data;
        } catch (fallbackError: any) {
          console.error('Erro no segundo endpoint /autenticacao/registrar:', {
            status: fallbackError.response?.status,
            message: fallbackError.response?.data?.message,
            data: fallbackError.response?.data
          });
          // Se ainda falhar, relançar o erro original com mensagem mais clara
          throw new Error(fallbackError.response?.data?.message || 'Erro ao cadastrar. Verifique se o email já está registrado ou tente novamente.');
        }
      }
      throw error;
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // API espera o refresh token no Authorization (Bearer)
      const response = await apiClient.put<AuthResponse>(
        '/autenticacao/refresh',
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`
          }
        }
      );

      const token = (response.data as any).token || (response.data as any).access_token || refreshToken;
      const newRefresh = (response.data as any).refreshToken || (response.data as any).refresh_token || refreshToken;

      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', newRefresh);

      return { token, refreshToken: newRefresh };
    } catch (error) {
      // Em modo desenvolvimento, manter o token
      console.warn('Refresh token falhou. Mantendo token atual.');
      return { token: refreshToken, refreshToken };
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    this.isAuthenticatedSubject.next(false);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

export const authService = new AuthService();
