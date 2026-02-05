import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function healthCheckPlugin() {
  const startedAt = Date.now();
  const apiUrl = process.env.VITE_API_URL || 'https://pet-manager-api.geia.vip';

  return {
    name: 'health-checks',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req?.url || req.method !== 'GET') return next();

        const path = req.url.split('?')[0];
        const now = new Date().toISOString();
        const uptime = Math.floor((Date.now() - startedAt) / 1000);
        const hasAuth = Boolean(req.headers?.authorization);
        const checks = {
          api: apiUrl ? 'configured' : 'not_configured',
          storage: 'available',
        };

        const sendJson = (statusCode: number, payload: any) => {
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        if (path === '/api/health') {
          return sendJson(200, {
            status: 'up',
            timestamp: now,
            uptime,
            checks,
          });
        }

        if (path === '/api/live') {
          return sendJson(200, {
            status: 'alive',
            timestamp: now,
            uptime,
          });
        }

        if (path === '/api/ready') {
          return sendJson(hasAuth ? 200 : 503, {
            status: hasAuth ? 'ready' : 'not_ready',
            timestamp: now,
            uptime,
          });
        }

        if (path === '/api/health/full') {
          return sendJson(hasAuth ? 200 : 503, {
            status: hasAuth ? 'up' : 'degraded',
            timestamp: now,
            uptime,
            checks,
            readiness: hasAuth ? 'ready' : 'not_ready',
            liveness: 'alive',
          });
        }

        return next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), healthCheckPlugin()],
})
