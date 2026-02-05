📋 **Informações Gerais - Projeto Front-end**

**Dados do Candidato**
- Nome: Alessandra Mirelle Fátima Ramos de Oliveira
- E-mail: alessandraamifa@gmail.com
- Telefone: 65 99633-0626
- CPF: 062.184.42179

**Vaga Pretendida**
- Empresa: Secretaria de Estado de Planejamento e Gestão - SEPLAG
- Cargo: Analista de Tecnologia da Informação
- Perfil Profissional: Engenheiro da Computação - Sênior 

🐾 **Amifa Pets – Gestão de Pets e Tutores**
Sistema para gerenciamento completo (CRUD) de pets e tutores, incluindo autenticação e upload de imagens.

## 🎯 Sobre o Projeto
O Amifa Pets é uma Single Page Application (SPA) desenvolvida com o objetivo de oferecer um registro público de Pets e seus tutores. A aplicação permite:

- Cadastrar, editar, excluir e visualizar pets
- Cadastrar, editar, excluir e visualizar tutores
- Vincular pets aos tutores
- Fazer upload de imagens adicionais por pet
- Fazer upload e visualização de documentos em PDF

🏗️ **Arquitetura e Fluxo**
O projeto utiliza uma arquitetura baseada em camadas para garantir escalabilidade e fácil manutenção:

```
┌─────────────────────────────┐
│        UI (React)           │
│  Componentes & Pages        │
└─────────────┬───────────────┘
              │
┌─────────────┴───────────────┐
│   Hooks Customizados        │
└─────────────┬───────────────┘
              │
┌─────────────┴───────────────┐
│   Services (Facade Pattern) │
└─────────────┬───────────────┘
              │
┌─────────────┴───────────────┐
│      API (Remota)           │
│      https://pet-manager-api.geia.vip
└─────────────────────────────┘
```

**Resumo do Fluxo:**
Componentes ↔ Hooks/Services ↔ Estado Reativo ↔ API oficial (remota: https://pet-manager-api.geia.vip).
Observação: o projeto está configurado por padrão para operar contra a API remota e **ONLINE_ONLY** está desabilitado (fallback local ativo). Para alterar, ajuste `ONLINE_ONLY` em [src/services/apiClient.ts](src/services/apiClient.ts).

📂 **Estrutura da Pasta**
- `src/`: código fonte (components, pages, services, context, hooks, types, utils)
- `public/`: arquivos estáticos servidos
- `package.json`, `vite.config.ts`, `tsconfig.json`: configurações e scripts do projeto
> Observação: pastas `uploads/` e `coverage/` não fazem parte do repositório por padrão. `coverage/` é gerada pelos testes quando executados com cobertura.


🚀 **Como Executar**
**No Terminal, execute os seguintes comandos**
| Passo         | Comando              | Observação                                    |
|---------------|----------------------|-----------------------------------------------|
| Instalação    | npm install          | Instala as dependências.                      |
| Front-end     | npm run dev          | Acesse: http://localhost:5173                 |

🧪 **Testes**
- Executar todos: `npm run test`
- Modo Watch: `npm run test -- --watch`
- Relatório de Cobertura: `npm run test:coverage`

## 🏥 Health Checks (Requisitos Sênior)

Health checks: existe UI e fallback local. Quando os endpoints HTTP falham, a tela exibe dados locais (status, uptime e checks). Implementacao em [src/pages/HealthPage.tsx](src/pages/HealthPage.tsx).

O sistema implementa quatro endpoints de health check conforme padrão Kubernetes para verificação de saúde da aplicação:

### Endpoints Disponíveis

| Endpoint | Método | Status 200 | Status 503 | Descrição |
|----------|--------|-----------|-----------|-----------|
| `/health` | GET | ✅ UP | ❌ DOWN | Verificação geral de saúde |
| `/ready` | GET | ✅ READY | ❌ NOT_READY | Aplicação pronta para requisições |
| `/live` | GET | ✅ ALIVE | - | Verificação de liveness (sempre 200) |
| `/health/full` | GET | ✅ Completo | ❌ Degradado | Informações detalhadas |

### Exemplo de Uso

> Observação: os endpoints HTTP podem não existir no ambiente local. Quando indisponíveis, a página de health exibe um status **local** (simulado). Em produção (build estático/`serve`), não há API HTTP real — o health check do container apenas valida o status HTTP do caminho configurado.

```bash
# Docker (porta exposta no host)
curl http://localhost:5174/health
```

### Resposta de Exemplo (/health)

```json
{
    "status": "up",
    "timestamp": "2026-02-02T10:30:45.123Z",
    "uptime": 15234,
    "checks": {
        "api": "connected",
        "storage": "available"
    }
}
```

### UI de Health Check

Acesse a página de health check diretamente no menu de navegação:
- Navegue para: `/health`
- Veja a interface gráfica com status detalhado
- Botão de refresh automático a cada 10 segundos

> Observação: o endpoint `/ready` depende de token em `localStorage`. Sem login, tende a retornar NOT_READY (503).

## 🐳 Docker

O projeto inclui suporte completo para containerização:

### Build da Imagem

```bash
docker build -t pet-manager:latest .
```

### Executar Container

```bash
docker run -p 5174:5173 --name pet-manager pet-manager:latest
```

### Docker Compose

```bash
docker-compose up -d
```

### Health Check do Container

O healthcheck do container está configurado no `docker-compose.yml`. Se preferir incluir no Dockerfile, adicione o bloco abaixo:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5173/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

### Variáveis de Ambiente

Configure via `.env`:

```env
VITE_API_URL=https://pet-manager-api.geia.vip
VITE_APP_PORT=5173
```

📝 **Observações Importantes**

- API Oficial: O sistema usa exclusivamente a API oficial: `https://pet-manager-api.geia.vip/q/swagger-ui/`
- ⚠️ Credenciais necessárias para acesso ao sistema admin/admin 
- Node.js Obrigatório: Este projeto requer Node.js instalado. Verifique com `node --version` e instale em https://nodejs.org/ se necessário.
- **Ambiente Recomendado**: Desenvolvido em **VS Code**. Baixe em https://code.visualstudio.com/

---
Desenvolvido  — 2026
