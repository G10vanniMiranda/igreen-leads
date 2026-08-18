# Arquitetura — iGreen Leads

Este documento descreve a arquitetura de código em `src/**` como ela existe hoje.
É a fonte de verdade **versionada** sobre como o sistema é construído. Para o
estado operacional atual (deployments, runtime, drift conhecido), consulte
[`docs/AGENT_HANDOFF.md`](AGENT_HANDOFF.md).

## Visão geral

Aplicação Next.js 16 (App Router) + React 19, organizada por feature sob
`src/features/**`, com `src/app/**` atuando apenas como camada fina de rotas
(páginas e Route Handlers) que delega para os módulos de feature.

```
src/app/**            rotas (páginas + Route Handlers) — camada fina
src/features/**/*      lógica de negócio, feature-sliced
src/config/**          configuração cross-cutting (env, security headers, route-scope)
src/components/**      componentes de UI compartilhados
src/lib/**, src/types/** boundary de integração iGreen
```

## Fluxo: Qualificação

`src/features/qualification/`

- `utils/qualification-machine.ts` — reducer determinístico de 6 passos.
- `config/qualification-options.ts` — opções/regras de cada passo.
- `components/qualification-flow.tsx` — componente client que orquestra o fluxo,
  incluindo a captura de fatura (delega para `features/documents`).
- `tracking/qualification-events.ts` — eventos de funil emitidos durante o fluxo.

Roda inteiramente no cliente; nada é persistido até a etapa de submissão do lead.

## Fluxo: Criação de lead

```
app/api/leads/route.ts
  → features/leads/services/lead-route-handler.ts
    → features/leads/schemas/lead-submission.ts   (validação server-side)
    → features/leads/services/lead-submission.ts  (serviço)
    → features/leads/repository/supabase-lead-repository.ts
      → RPC create_lead_submission (idempotente por submission_id)
```

Antes do RPC, o handler exige requisição same-origin
(`features/security/request-security.ts`) e aplica rate limit
(`features/security/rate-limit.ts`, `LEAD_RATE_LIMIT`).

## Fluxo: Upload de fatura

```
app/api/lead-documents/route.ts
  → features/documents/services/bill-upload-route-handler.ts
    → features/documents/schemas/bill-upload.ts   (validação: tamanho, MIME,
                                                     extensão, magic bytes, nome)
    → features/documents/services/bill-upload.ts  (serviço)
      → features/documents/storage/supabase-document-storage.ts  (upload no bucket)
      → features/documents/repository/supabase-document-repository.ts
        → RPC register_bill_upload (idempotente por (lead_id, document_type))
```

Em caso de falha de registro no banco ou duplicidade, o serviço remove o objeto
recém-enviado do Storage (`cleanupUploadedObject`) para evitar objetos órfãos.
Mesma proteção de same-origin + rate limit (`UPLOAD_RATE_LIMIT`) do fluxo de leads.

## Fluxo: Admin

```
app/admin/(operations)/layout.tsx   — gate de sessão para páginas do dashboard/detalhe
app/admin/**                        — páginas (login, dashboard, detalhe do lead)
app/api/admin/**                    — Route Handlers (session, logout, search,
                                       status/notes/bill/whatsapp/igreen-handoff por lead)
  → features/admin/handlers.ts      — orquestra auth + same-origin + repositório
    → features/admin/repository.ts  — chamadas RPC via REST (rest/v1/rpc/<nome>)
```

RPCs administrativas chamadas por `repository.ts`: `admin_dashboard_metrics`,
`admin_list_leads`, `admin_get_lead`, `admin_get_bill_document`,
`admin_update_lead_status`, `admin_update_internal_notes`,
`admin_record_handoff_event`.

Erros do repositório são tipados (`AdminRepositoryError`, classes
`configuration | upstream | not_found`), mas a maioria dos handlers hoje
colapsa isso numa resposta genérica 500 ao cliente (ver backlog em
`AGENT_HANDOFF.md`).

## Autenticação administrativa

`src/features/admin/auth.ts` — sessão stateless assinada com HMAC-SHA256,
payload `{role, issuedAt, expiresAt}`, cookie `HttpOnly; SameSite=Strict`,
`Secure` condicional ao protocolo da requisição recebida. Verificação e
comparação de senha usam comparação de tempo constante. Sem MFA, sem lista de
revogação central (ver `docs/SECURITY.md`).

`src/features/admin/search-token.ts` — token de busca por nome/telefone
cifrado (AES-GCM), evita PII em querystring/logs de acesso.

## Handoff comercial (WhatsApp / iGreen)

`src/features/admin/handoff.ts` — monta as URLs de destino
(`buildWhatsAppUrl` → `wa.me/<dígitos>`; `buildCommercialIGreenUrl` →
`green.igreenenergy.com.br`, via `src/lib/igreen.ts`/`src/config/env.ts`).

`src/features/admin/handoff-action-form.tsx` — formulário client, POST
same-origin, `rel="noopener"` (não `noreferrer` — ver regressão histórica em
`AGENT_HANDOFF.md`), `actionId` (UUID) regenerado a cada submissão para
idempotência.

`handlers.ts#handoffHandler` — verifica sessão + same-origin, registra o
evento (`admin_record_handoff_event`) e responde com redirect 303 +
`Referrer-Policy: no-referrer` para o destino externo. Nunca altera o status
do lead automaticamente.

## Acesso a fatura assinada (admin)

`src/features/admin/signed-bill.ts` — `createSignedBillUrl` solicita uma
signed URL ao Supabase Storage (`BILL_SIGNED_URL_TTL_SECONDS = 120`) e
canonicaliza a resposta para o formato `/storage/v1/object/sign/{bucket}/{path}`,
validando origem/HTTPS/ausência de fragmento e que o path bate exatamente com
o esperado.

## Boundary Supabase (servidor)

`src/features/supabase/server-headers.ts` é o único construtor de headers
usado pelos 5 pontos de acesso server-side ao Supabase (lead repo, document
repo, document storage, admin repo, signed-bill):

- Credencial `sb_secret_...` → apenas header `apikey`, nunca `Authorization`.
- JWT legado (3 segmentos base64url) → `apikey` **e** `Authorization: Bearer`.
- Credenciais vazias, com caracteres de controle ou padrão de placeholder são
  rejeitadas antes de qualquer chamada.

Testado ponta a ponta em `src/features/supabase/supabase-server.test.ts`,
incluindo verificação de que nenhum arquivo `"use client"` referencia a
credencial de service role.

## Padrão das RPCs (lado banco)

Todas as RPCs em `supabase/migrations/*.sql` seguem o mesmo padrão: `security
invoker`, `set search_path = ''`, referências totalmente qualificadas a
`private.*`, `revoke all ... from public, anon, authenticated` seguido de
`grant execute ... to service_role` apenas. Ver `docs/AGENT_HANDOFF.md` para o
inventário de migrations e o estado runtime do bucket de Storage.

## Segurança cross-cutting

- `src/config/security-headers.ts` — CSP (variante pública e variante admin,
  que difere apenas em `form-action`), HSTS condicional, `X-Robots-Tag`,
  demais headers fixos. Consumido por `next.config.ts`.
- `src/features/security/rate-limit.ts` — limitador em memória, janela fixa.
- `src/features/security/request-security.ts` — checagem de same-origin e
  derivação de chave de abuso (HMAC com salt por processo).

## Tracking / Analytics

`src/features/tracking/**` — `client.ts`, `providers.ts` (adaptadores
Meta/GA), `browser-providers.ts`, `config.ts` (restringe habilitação a
`test`/`preview`), `attribution.ts` (first-touch UTM/referrer, journey UUID em
`sessionStorage`), `funnel-outcomes.ts`.

`src/features/privacy/consent.ts` + `consent-preferences.tsx` — preferências
de consentimento em `localStorage`, independentes do `consent_contact`
persistido no lead. Ativação de provider exige `enabled && consentGranted &&
id && environment in {test, preview}`.

## Separação de ambientes

Não há refs de projeto, URLs ou branching por ambiente hardcoded no código.
Isolamento TEST/HOMOLOGATION/PRODUCTION é obtido inteiramente pelos valores de
variáveis de ambiente injetados por ambiente Vercel — o código só lê flags
(`ANALYTICS_ENVIRONMENT`, `NODE_ENV`, `SECURITY_HTTPS_HEADERS_ENABLED`,
`INDEXING_ENABLED`) e nomes de variável (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, etc.), nunca valores específicos de ambiente.

## Boundary de integração iGreen

`src/config/env.ts` valida `IGREEN_BASE_URL` (HTTPS, sem credenciais
embutidas), `IGREEN_REFERRAL_ID`, `IGREEN_SEND_CONTRACT` (booleano estrito).
`src/lib/igreen.ts` e `src/types/igreen.ts` fornecem os tipos/helpers
consumidos por `features/admin/handoff.ts`.
