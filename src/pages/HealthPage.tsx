import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';

type HealthStatus = {
  status: string;
  timestamp?: string;
  uptime?: number;
  checks?: Record<string, string>;
};

type FullHealthStatus = HealthStatus & {
  readiness?: string;
  liveness?: string;
};

const fetchJson = async (url: string, withAuth = false) => {
  const headers: Record<string, string> = {};
  if (withAuth) {
    const token = localStorage.getItem('authToken');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Resposta não é JSON');
  }
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
};

const buildLocalHealth = () => {
  const now = new Date().toISOString();
  const uptime = Math.floor(performance.now() / 1000);
  const apiUrl = import.meta.env.VITE_API_URL || 'https://pet-manager-api.geia.vip';
  const hasAuth = Boolean(localStorage.getItem('authToken'));
  const checks = {
    api: apiUrl ? 'configured' : 'not_configured',
    storage: 'available',
  };

  return {
    health: {
      status: 'up',
      timestamp: now,
      uptime,
      checks,
    },
    ready: {
      status: hasAuth ? 'ready' : 'not_ready',
      timestamp: now,
      uptime,
    },
    live: {
      status: 'alive',
      timestamp: now,
      uptime,
    },
    full: {
      status: hasAuth ? 'up' : 'degraded',
      timestamp: now,
      uptime,
      checks,
      readiness: hasAuth ? 'ready' : 'not_ready',
      liveness: 'alive',
    },
  };
};

export function HealthPage() {
  const initial = buildLocalHealth();
  const [health, setHealth] = useState<HealthStatus | null>(initial.health);
  const [ready, setReady] = useState<HealthStatus | null>(initial.ready);
  const [live, setLive] = useState<HealthStatus | null>(initial.live);
  const [full, setFull] = useState<FullHealthStatus | null>(initial.full);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'endpoint'>('local');

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, readyRes, liveRes, fullRes] = await Promise.all([
        fetchJson('/api/health'),
        fetchJson('/api/ready', true),
        fetchJson('/api/live'),
        fetchJson('/api/health/full', true),
      ]);

      const fallback = buildLocalHealth();
      const nextHealth = healthRes.data?.status ? healthRes.data : fallback.health;
      const nextReady = readyRes.data?.status ? readyRes.data : fallback.ready;
      const nextLive = liveRes.data?.status ? liveRes.data : fallback.live;
      const nextFull = fullRes.data?.status ? fullRes.data : fallback.full;

      setHealth(nextHealth);
      setReady(nextReady);
      setLive(nextLive);
      setFull(nextFull);
      setSource('endpoint');

      if (!healthRes.ok || !readyRes.ok || !liveRes.ok || !fullRes.ok) {
        setError('Alguns checks retornaram status não saudável.');
      }
    } catch (err) {
      const local = buildLocalHealth();
      setHealth(local.health);
      setReady(local.ready);
      setLive(local.live);
      setFull(local.full);
      setSource('local');
      setError('Health endpoints indisponíveis. Exibindo status local.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = useMemo(() => {
    if (!health?.uptime) return '-';
    const seconds = Math.floor(health.uptime);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }, [health?.uptime]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </Link>

        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Health Checks</h1>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4">Fonte: {source === 'endpoint' ? 'endpoints HTTP' : 'status local'}</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">/health</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Status: <span className="font-semibold text-gray-900">{health?.status || '-'}</span></p>
              <p>Uptime: <span className="font-semibold text-gray-900">{formatUptime}</span></p>
              <p>Timestamp: <span className="font-semibold text-gray-900">{health?.timestamp || '-'}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">/ready</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Status: <span className="font-semibold text-gray-900">{ready?.status || '-'}</span></p>
              <p>Ready: <span className="font-semibold text-gray-900">{full?.readiness || '-'}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">/live</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Status: <span className="font-semibold text-gray-900">{live?.status || '-'}</span></p>
              <p>Alive: <span className="font-semibold text-gray-900">{full?.liveness || '-'}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">/health/full</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Status: <span className="font-semibold text-gray-900">{full?.status || '-'}</span></p>
              <p>Checks:</p>
              <ul className="list-disc pl-5">
                {full?.checks ? (
                  Object.entries(full.checks).map(([key, value]) => (
                    <li key={key} className="text-gray-700">{key}: <span className="font-medium">{value}</span></li>
                  ))
                ) : (
                  <li className="text-gray-500">-</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
