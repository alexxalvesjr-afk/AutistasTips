# BetManager 🎯

SaaS de gerenciamento profissional de apostas esportivas — uma planilha
inteligente, totalmente online, com dashboard premium em dark mode.

![stack](https://img.shields.io/badge/Next.js%2015-black) ![stack](https://img.shields.io/badge/TypeScript-strict-blue) ![stack](https://img.shields.io/badge/Prisma-PostgreSQL-lightgrey) ![sec](https://img.shields.io/badge/npm%20audit-0%20vulns-success)

## Funcionalidades

- **Autenticação completa**: login, cadastro, recuperação/troca de senha, JWT (15 min) + refresh token rotativo com detecção de reuso, sessões independentes por dispositivo, logout global, lockout anti força bruta.
- **Dashboard**: saldo total, lucro, ROI, entradas, win rate, stake média, lucro mensal/semanal + gráficos de evolução da banca, lucro por esporte, ROI mensal e lucro diário.
- **Cadastro de apostas**: data, casa, esporte, campeonato, jogo, mercado, seleção, odd, stake, resultado (Win/Loss/Void/Half Win/Half Loss), lucro calculado automaticamente, observações e tags.
- **Planilha**: tabela com pesquisa, filtros (período com presets, casa, esporte, resultado), ordenação, paginação, edição inline (odd, stake, resultado), duplicar/excluir, seleção múltipla e exportação.
- **Relatórios**: lucro diário/semanal/mensal/anual, ROI, yield, odds/stake médias, green/red/void, maiores sequências WIN/LOSS.
- **Estatísticas**: pizza de resultados, linha de lucro acumulado, barras por casa, heatmap por dia da semana, calendário de resultados, distribuição de odds e de stake.
- **Importação**: CSV/Excel com detecção automática de colunas e preview.
- **Exportação**: CSV, Excel e PDF.
- **Configurações**: tema claro/escuro, idioma, moeda, formato decimal, troca de senha, exclusão de conta.
- **Admin**: listagem, edição, bloqueio e exclusão de usuários, plano, último login e volume de apostas.

Segurança em profundidade documentada em [SECURITY.md](./SECURITY.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · shadcn/ui ·
Framer Motion · Recharts · React Query · React Hook Form · Zod · Prisma ·
PostgreSQL · JWT (jose) · bcryptjs · Docker.

## Como rodar

### Com Docker (recomendado)

```bash
cp .env.example .env
# edite o .env: defina POSTGRES_PASSWORD, JWT_ACCESS_SECRET e JWT_REFRESH_SECRET
# (gere segredos com: openssl rand -base64 48)

docker compose up --build
```

A aplicação sobe em `http://localhost:3000` com migrações aplicadas
automaticamente. Rode o seed uma única vez:

```bash
docker compose exec app npx prisma db seed
```

### Desenvolvimento local

```bash
cp .env.example .env        # configure DATABASE_URL e os segredos JWT
npm install
npx prisma migrate dev      # aplica migrações
npm run db:seed             # esportes, casas e planos padrão
npm run dev
```

### Criar um administrador

```bash
SEED_ADMIN_EMAIL=admin@seudominio.com SEED_ADMIN_PASSWORD='SenhaForte#123' npm run db:seed
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gera Prisma Client) |
| `npm start` | Servidor de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed de dados base |

## Arquitetura

```
src/
├── app/                  # App Router
│   ├── (auth)/           # login, register, forgot/reset password
│   ├── (app)/            # área autenticada (dashboard, planilha, …)
│   └── api/              # route handlers (backend)
├── components/
│   ├── ui/               # componentes base (shadcn-style)
│   ├── layout/           # sidebar, topbar, app shell
│   ├── charts/           # wrappers de gráficos
│   ├── entries/          # tabela, filtros e formulário de apostas
│   └── auth/             # telas de autenticação
├── hooks/                # React Query hooks
├── services/             # regras de negócio (auth, entries, stats)
├── repositories/         # acesso a dados escopado por usuário
├── lib/                  # env, prisma, auth, rate-limit, validações…
├── types/                # tipos compartilhados da API
└── middleware.ts         # CSRF (origin check) + roteamento de sessão
```

**Fluxo de autenticação**: registro/login → access token JWT (15 min, cookie
httpOnly) + refresh token opaco rotativo (7 dias, cookie restrito a
`/api/auth`) → em 401 o cliente renova via `/api/auth/refresh` e repete a
requisição → reuso de token antigo fora da janela de graça revoga todas as
sessões do usuário.

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Rotação de sessão |
| POST | `/api/auth/logout` · `/logout-all` | Logout (atual/todas) |
| POST | `/api/auth/forgot-password` · `/reset-password` · `/change-password` | Senhas |
| GET | `/api/auth/me` | Perfil autenticado |
| GET/POST | `/api/entries` | Listagem filtrada / criação |
| PATCH/DELETE | `/api/entries/:id` | Edição / exclusão |
| POST | `/api/entries/bulk` | Excluir/duplicar em massa |
| POST | `/api/entries/import` | Importação em lote |
| GET | `/api/dashboard` · `/api/reports` · `/api/stats` | Agregações |
| GET/POST | `/api/sports` · `/api/bookmakers` · `/api/tags` | Lookups |
| PATCH | `/api/profile` | Perfil e preferências |
| DELETE | `/api/account` | Exclusão de conta (senha exigida) |
| GET/DELETE | `/api/sessions[/:id]` | Sessões ativas |
| GET/PATCH/DELETE | `/api/admin/users[/:id]` | Administração |
| GET | `/api/health` | Health check |
