import axios, { type AxiosInstance } from 'axios';

// Sempre usar a API pública oficial
const API_BASE_URL = 'https://pet-manager-api.geia.vip';

// Permitir fallback local quando a API não retornar dados (ex.: 401), para preservar fotos anexadas.
export const ONLINE_ONLY = false;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Apenas tenta refresh uma vez por requisição
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              console.log('[ApiClient] Tentando renovar token...');
              // Criar um cliente separado para evitar interceptor infinito
              const refreshClient = axios.create({
                baseURL: API_BASE_URL,
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' },
              });
              const { data } = await refreshClient.put('/autenticacao/refresh', {}, {
                headers: { Authorization: `Bearer ${refreshToken}` },
              });
              const newToken = data.token || data.access_token;
              const newRefresh = data.refreshToken || data.refresh_token;
              
              if (newToken) {
                localStorage.setItem('authToken', newToken);
                if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
                console.log('[ApiClient] Token renovado com sucesso');
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError: any) {
            console.warn('[ApiClient] Falha ao renovar token:', refreshError.response?.status);
          }
          // Se refresh falhar, redirecionar para login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }

  getInstance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().getInstance();
