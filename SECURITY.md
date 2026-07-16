# Relatório de Auditoria de Segurança — BetManager

Auditoria realizada durante o desenvolvimento, com correções aplicadas e
validadas por smoke tests automatizados contra o build de produção.

---

## 1. Vulnerabilidades encontradas e mitigadas

| # | Risco | Nível | Mitigação aplicada | Arquivos |
|---|-------|-------|--------------------|----------|
| 1 | Dependências vulneráveis (`jspdf` ≤ 4.2.0 com dompurify vulnerável — crítico; `postcss` < 8.5.10; `uuid` < 11.1.1 via exceljs) | **Crítico** | `jspdf@^4.2.1` + `jspdf-autotable@^5`, `dompurify@^3.4.12` fixado, overrides de `postcss` e `uuid`. `npm audit`: **0 vulnerabilidades** | `package.json` |
| 2 | Reuso de refresh token rotacionado não disparava revogação em família (janela para sequestro de sessão) | **Alto** | Hash anterior persistido (`previousTokenHash`) com janela de graça de 10s; reuso fora da graça revoga todas as sessões e gera auditoria `auth.refresh_reuse_detected` | `prisma/schema.prisma`, `src/lib/auth/session-service.ts` |
| 3 | Enumeração de usuários via tempo de resposta no login | **Médio** | Hash bcrypt executado mesmo quando o e-mail não existe (equalização de tempo); mensagem única "E-mail ou senha incorretos" | `src/services/auth-service.ts` |
| 4 | Força bruta em credenciais | **Alto** | Rate limit por IP **e** por conta-alvo (5/min) + lockout de conta após 5 falhas por 15 min + auditoria de tentativas | `src/lib/rate-limit.ts`, `src/services/auth-service.ts` |
| 5 | CSRF em rotas mutantes autenticadas por cookie | **Alto** | Cookies `SameSite=Lax` + verificação de `Origin`/`Sec-Fetch-Site` no middleware para POST/PUT/PATCH/DELETE (403 em origem divergente — testado) | `src/middleware.ts` |
| 6 | IDOR em entradas, sessões, tags, esportes e casas | **Alto** | Toda query escopada por `userId` na camada de repositório; relacionamentos verificados antes de vincular (`assertOwnedRelations`); respostas 404 sem revelar existência — testado com dois usuários | `src/repositories/*`, `src/services/*` |
| 7 | CSV/Excel injection na exportação | **Médio** | Prefixos de fórmula (`= + - @ \t \r`) neutralizados em toda célula exportada | `src/lib/export.ts`, `src/lib/sanitize.ts` |
| 8 | Payload excessivo / DoS por corpo grande | **Médio** | Limite de 100 KB por request (5 MB somente na importação), verificação de `Content-Length` e do corpo lido | `src/lib/api-handler.ts` |
| 9 | Vazamento de detalhes internos em erros | **Médio** | Tratamento global de exceções com envelope padronizado; mensagens genéricas para 500; erros Prisma mapeados (P2002→409, P2025→404) | `src/lib/api-handler.ts`, `src/lib/errors.ts` |
| 10 | Segredos fracos ou ausentes em produção | **Alto** | Validação de env na inicialização (Zod): segredos JWT com mínimo de 32 chars obrigatórios; app não sobe sem eles | `src/lib/env.ts` |
| 11 | Tokens em texto puro no banco | **Crítico** | Refresh tokens e tokens de reset armazenados apenas como SHA-256 com pepper (segredo do servidor); nunca logados | `src/lib/auth/tokens.ts` |
| 12 | XSS via campos livres (observações, nomes) | **Médio** | Escape automático do React (nenhum `dangerouslySetInnerHTML` no projeto), sanitização de caracteres de controle na entrada, CSP restritiva | `src/lib/sanitize.ts`, `next.config.ts` |

## 2. Controles implementados por área

### Autenticação
- **Hash de senha**: bcrypt custo 12 (`bcryptjs`).
- **Política de senha forte**: mínimo 10 chars, maiúscula, minúscula, número e símbolo — validada no cliente e no servidor.
- **JWT de acesso**: HS256, 15 minutos, `iss`/`aud` verificados, carrega `sid` para revogação imediata por sessão.
- **Refresh token**: opaco (48 bytes aleatórios), rotativo a cada uso, hash + pepper no banco, cookie restrito a `/api/auth`, 7 dias.
- **Sessões por dispositivo**: tabela `sessions` com IP/user-agent, revogação individual (tela Perfil), logout global, revogação total em troca/reset de senha e bloqueio de conta.
- **Recuperação de senha**: token único de 32 bytes, hash no banco, expiração 30 min, uso único, resposta idêntica exista ou não a conta.

### Controle de acesso
- `requireUser()`/`requireAdmin()` em todos os handlers protegidos (defesa em profundidade além do middleware).
- Bloqueio de conta (`status=BLOCKED`) derruba sessões imediatamente e impede refresh.
- Admin não consegue editar/excluir a própria conta pelas rotas de admin.

### Headers HTTP (equivalente ao Helmet)
`Content-Security-Policy` (default-src 'self', frame-ancestors 'none', object-src 'none'), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (2 anos, preload), `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-DNS-Prefetch-Control`, `poweredByHeader: false`, source maps de browser desativados em produção.

> `Cross-Origin-Embedder-Policy` foi deliberadamente omitido: exigiria CORP em
> todo recurso e não há uso de `SharedArrayBuffer`. Adicionar se necessário.

### CORS
Não há CORS permissivo: a API só aceita requisições same-origin (cookies SameSite + verificação de Origin). Nenhum `Access-Control-Allow-Origin` é emitido.

### Rate limiting
Janela deslizante em memória: login 5/min (IP e e-mail), cadastro 5/10min, recuperação 3/10min, reset/troca de senha 5/10min, refresh 30/min, importação 10/min, API geral 240/min por usuário. Resposta 429 com `Retry-After`.

### Validação e sanitização
Zod em **todas** as entradas (corpo, query e params), com limites de tamanho, coerção de tipos e transforms de sanitização. Import limitado a 2.000 linhas/5 MB.

### SQL Injection
Exclusivamente Prisma ORM com queries parametrizadas. O único raw SQL é `SELECT 1` constante no health check.

### Uploads
Nenhum arquivo é armazenado no servidor: o parse de CSV/Excel ocorre no navegador e apenas JSON validado chega à API (extensão e tamanho verificados no cliente; revalidação integral por Zod no servidor).

### Logs e auditoria
`audit_logs` registra: registro, login, falhas de login, lockout, logout, logout global, reuso de refresh detectado, esqueci/reset/troca de senha, exclusão de conta, ações de admin, importações e exclusões em massa — com IP e user-agent truncados. **Nunca** são registrados senhas, tokens ou cookies.

### Banco de dados
Índices em todas as chaves de consulta (`userId+date`, `userId+result`, etc.), constraints únicas (`email`, `userId+name`), FKs com `onDelete: Cascade` apenas onde a posse é do usuário (dados pessoais) e `SetNull` para lookups compartilhados, Decimal para valores monetários.

## 3. Validação executada

Smoke tests contra o build de produção (`next build` + `node server.js` + PostgreSQL 16):

- ✅ Registro → cookies httpOnly emitidos → `/me` → criação de entrada → dashboard com métricas corretas
- ✅ POST com `Origin` externo → **403** (CSRF)
- ✅ Requisição sem cookie → **401**
- ✅ PATCH/DELETE de entrada de outro usuário → **404** (IDOR)
- ✅ Rota admin com usuário comum → **403**
- ✅ 6ª tentativa de login em 1 min → **429**
- ✅ Rotação de refresh: token antigo → **401**; reuso fora da graça → revogação em família comprovada (token atual passa a **401**) + evento de auditoria
- ✅ Todos os security headers presentes; `X-Powered-By` ausente
- ✅ `npm audit`: 0 vulnerabilidades
- ✅ UI validada visualmente (login, dashboard, planilha, estatísticas)

## 4. OWASP Top 10 — cobertura

| Categoria | Status |
|-----------|--------|
| A01 Broken Access Control | Escopo por `userId` em todas as queries, RBAC, anti-IDOR testado |
| A02 Cryptographic Failures | bcrypt(12), tokens hasheados com pepper, HSTS, cookies Secure |
| A03 Injection | Prisma parametrizado, Zod, sanitização, CSV injection neutralizada |
| A04 Insecure Design | Rotação de refresh c/ detecção de reuso, lockout, limites por plano |
| A05 Security Misconfiguration | Headers completos, env validada, erros genéricos, `robots.txt` noindex |
| A06 Vulnerable Components | Audit zerado, overrides fixando versões corrigidas |
| A07 Auth Failures | Política de senha, anti-enumeração, rate limit por IP e conta, lockout |
| A08 Integrity Failures | Lockfile versionado, build multi-stage reprodutível, sem CDN externo (CSP `self`) |
| A09 Logging Failures | Auditoria estruturada de eventos de segurança sem dados sensíveis |
| A10 SSRF | Nenhuma requisição a URLs fornecidas por usuário no servidor |

## 5. Recomendações futuras

1. **Verificação de e-mail** no cadastro (tabela e fluxo prontos para extensão via `emailVerifiedAt`).
2. **Rate limit distribuído** (Redis) ao escalar horizontalmente — a interface de `enforceRateLimit` permite trocar o armazenamento sem tocar nas rotas.
3. **2FA (TOTP)** para contas de administrador.
4. **Sentry** (ou similar): instrumentar `errorResponse()` e `audit()` — pontos únicos já centralizados.
5. **CSP com nonce** por request (remover `unsafe-inline` de scripts) via middleware.
6. **Argon2id** no lugar de bcrypt quando o ambiente de deploy suportar módulos nativos.
7. Detecção de login suspeito (novo IP/país → e-mail de alerta) usando os dados já gravados em `sessions`.

## 6. Itens que dependem de infraestrutura

- **HTTPS/TLS**: terminação no proxy/CDN (o app envia HSTS; `Secure` ativo em produção).
- **WAF/CDN e proteção DDoS** (Cloudflare, AWS WAF…).
- **Backups do PostgreSQL** com PITR + testes de restauração.
- **Gerenciamento de segredos** (Vault, AWS Secrets Manager, Doppler…) — nunca commitar `.env`.
- **Rotação de logs** e retenção da tabela `audit_logs`.
- **Monitoramento/alertas** sobre o endpoint `/api/health` (liveness + conectividade do banco).
- **Ambientes separados** (dev/homolog/prod) com bancos e segredos distintos.

## Checklist de produção

- [ ] `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` gerados com `openssl rand -base64 48`
- [ ] `APP_URL` com o domínio público (usado nos links de e-mail)
- [ ] `NODE_ENV=production`
- [ ] SMTP configurado (sem SMTP, reset de senha não envia e-mail em produção)
- [ ] HTTPS obrigatório no proxy + redirect 80→443
- [ ] Compressão (gzip/brotli) no proxy
- [ ] Backup automático do banco
- [ ] Monitoramento de `/api/health`
- [ ] Seed executado (`npm run db:seed`) e admin criado via `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
