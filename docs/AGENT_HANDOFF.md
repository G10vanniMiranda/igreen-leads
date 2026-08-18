# Agent Handoff — iGreen Leads

Este documento é o ponto de entrada operacional para qualquer agente ou
desenvolvedor que entre neste projeto sem contexto prévio de conversa. Ele é
agnóstico de agente (Codex, Claude Code ou qualquer outro) e não deve depender
de memória de sessão, histórico de chat ou informação fora deste repositório.

## Como usar este documento

Leia este arquivo antes de qualquer alteração relevante. Ele distingue três
tipos de informação:

- **Versioned Source of Truth** — o que está no repositório: código,
  migrations, e os documentos especializados abaixo. Correto por definição,
  desde que o código/migration em questão não tenha sido alterado fora do
  controle de versão.
- **Runtime State** — o estado efetivamente verificado em Supabase/Vercel em
  um dado momento (seção 5). É um snapshot, não uma garantia contínua — pode
  ficar desatualizado se não for revisado a cada release relevante.
- **Known Drift** — casos em que Runtime State e Versioned Source of Truth
  divergem intencionalmente ou por débito conhecido (seção 7). Diferente de
  uma falha: é um risco documentado, não corrigido automaticamente.

Documentos especializados não são duplicados aqui — apenas referenciados:

| Assunto | Fonte de verdade |
| --- | --- |
| Segurança, CSP, auth admin, rate limiting, upload | [`SECURITY.md`](SECURITY.md) |
| Dados pessoais, retenção | [`PRIVACY_DATA_MAP.md`](PRIVACY_DATA_MAP.md) |
| Atendimento a titulares de dados | [`DATA_SUBJECT_REQUESTS.md`](DATA_SUBJECT_REQUESTS.md) |
| Backup, restore, rollback | [`PRODUCTION_OPERATIONS.md`](PRODUCTION_OPERATIONS.md) |
| Roadmap de produto | [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) |
| Arquitetura de código | [`ARCHITECTURE.md`](ARCHITECTURE.md) |

## 1. Objetivo do produto

Aplicação de aquisição e operação de leads da Conexão Green: landing page,
pré-qualificação, captura consentida de contato, upload privado de fatura de
energia, painel administrativo interno, encaminhamento comercial (WhatsApp /
iGreen) e controles de privacidade/segurança/atribuição de marketing.

## 2. Ambientes

Três ambientes logicamente isolados. **TEST ≠ PRODUCTION** é uma invariante —
nunca misturar credenciais ou dados entre eles. Esta seção é a referência
única para a topologia de ambientes; as demais seções deste documento apenas
apontam de volta para aqui em vez de repetir os mesmos fatos.

- **TEST** — Supabase `igreen-leads-test` (ref `oyznxaewrwgzguzanoro`).
- **HOMOLOGATION** — Vercel Custom Environment `homologation`, branch
  histórica `preview/homologation`, **usa o Supabase TEST**.
- **PRODUCTION** — Supabase `igreen-leads-prod` (ref `uzhvuqokthtgtppkcgzu`),
  branch `main` na Vercel.

## 3. Git

- Branch de Produção: `main`.
- Branch histórica de homologação: `preview/homologation`.
- Rollback é feito apenas via `git revert` auditável — nunca reescrita de
  histórico ou force-push (ver [`PRODUCTION_OPERATIONS.md`](PRODUCTION_OPERATIONS.md)).
- Migrations são forward-only; correções de schema exigem nova migration
  revisada, nunca edição de migration já aplicada.

## 4. Vercel

- Projeto `igreen-leads`, Production Branch `main`.
- Custom Environment `homologation` — mapeamento para Supabase TEST descrito
  na seção 2 (Ambientes).
- Sem `vercel.json` no repositório — configuração de projeto/domínio vive
  inteiramente no painel/API da Vercel, fora deste repositório.
- Sem domínio customizado configurado.

## 5. Runtime state snapshot

Estado operacional verificado na última validação registrada neste documento.

- **Last verified release commit:** `d787a7c21388e0b3ee5a42fa23011a2e5c79f26c`
- **Data do snapshot operacional:** 2026-08-17
- **Production URL:** `https://igreen-leads.vercel.app`
- **Deployment:** `dpl_2731guQGEv53BNhL4DyB9VkXhTSt`
- **Smoke test:** PASS
- **Baseline pós-cleanup:** `leads = 0`, `documents = 0`, `events = 0`,
  `storage_objects = 0`
- **Lançamento controlado:** `INDEXING = OFF`, `META = OFF`, `GA = OFF`,
  `CUSTOM DOMAIN = NOT CONFIGURED`

Se o HEAD do repositório ou o estado externo real avançarem além do commit
registrado acima, trate este snapshot como potencialmente desatualizado e
revalide o estado externo (Supabase/Vercel) antes de tratar esta seção como
atual. Este bloco é um snapshot único, não um histórico de deployments — ao
atualizá-lo, substitua os valores acima em vez de acrescentar entradas.

Nenhum secret, valor de variável de ambiente ou identidade de quem validou a
release é registrado aqui ou em qualquer outro lugar deste repositório.

## 6. Supabase — Data API e Storage

- Schema `private` (leads, documentos, eventos) nunca é exposto pela Data API
  — apenas via RPCs `SECURITY INVOKER` com `search_path` vazio, executáveis
  somente por `service_role`. Ver inventário completo em
  [`ARCHITECTURE.md`](ARCHITECTURE.md) e as 5 migrations em
  `supabase/migrations/`.
- Bucket `lead-documents`: privado (`public=false`), aceita PDF/JPEG/PNG.
- Limite de upload da aplicação: **4194304 bytes (4 MiB)**, validado em
  `src/features/documents/types/document.ts` (`MAX_BILL_BYTES`).
- Signed URLs administrativas: TTL de 120 segundos, canonicalizadas para
  `/storage/v1/object/sign/{bucket}/{path}`.

## 7. Known Drift — limite de upload

**Classificação: KNOWN INFRASTRUCTURE DRIFT / REPRODUCIBILITY DEBT.**
**Não é uma falha ativa de Production.**

| Camada | Valor |
| --- | --- |
| Application (`MAX_BILL_BYTES`, código) | 4.194.304 bytes (4 MiB) |
| Storage bucket `lead-documents`, runtime em Production | 4.194.304 bytes (4 MiB) |
| Storage bucket, valor definido na migration histórica | 10 MiB (10.485.760 bytes) |
| DB metadata CHECK (`lead_documents.size_bytes`) | 10 MiB (10.485.760 bytes) |

Durante o bootstrap do Supabase Production, o `file_size_limit` do bucket foi
ajustado manualmente para 4 MiB e confirmado por read-back — ou seja, o
runtime de Production já está alinhado com o limite da aplicação. A migration
versionada (`20260814015540_create_bill_upload.sql`) e o `CHECK` de metadata
no banco continuam registrando 10 MiB e não foram atualizados. Isso é débito
de reprodutibilidade: se o ambiente Production precisar ser recriado do zero a
partir das migrations, o bucket nasceria em 10 MiB até um ajuste manual
equivalente ser reaplicado. Correção (nova migration forward-only alinhando os
dois valores) está no backlog (seção 13) e requer Human Gate — não deve ser
executada apenas por constar aqui.

## 8. Autenticação administrativa

Sessão única, sem contas por usuário: `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`
(ambos server-only). Cookie HMAC-assinado, `HttpOnly; SameSite=Strict`, TTL de
8 horas. Sem MFA, sem revogação central de sessão. Detalhe completo em
[`SECURITY.md`](SECURITY.md).

## 9. Secrets e credenciais Supabase

- A variável permanece nomeada `SUPABASE_SERVICE_ROLE_KEY` por compatibilidade
  histórica, mesmo quando contém uma credencial moderna.
- Credencial `sb_secret_...` → enviada **somente** como header `apikey`.
  **Nunca** como `Authorization: Bearer sb_secret_...`.
- JWT legado (3 segmentos) → enviado como `apikey` **e**
  `Authorization: Bearer`.
- Nenhum valor de secret ou variável de ambiente é registrado neste
  repositório, em nenhum documento.

## 10. Invariantes

- `TEST != PRODUCTION` — nunca compartilhar credenciais ou dados.
- `private` nunca é exposto pela Data API.
- Bucket `lead-documents` permanece privado.
- Limite de upload da aplicação = 4 MiB.
- `sb_secret_` usa somente `apikey`; JWT legado pode usar `apikey` +
  `Authorization: Bearer`.
- Meta e GA permanecem OFF até autorização explícita.
- Indexação permanece OFF até autorização explícita.

## 11. Target Verification Before Write

Antes de qualquer write externo (Supabase, Vercel, ou qualquer serviço fora
deste repositório) — mesmo que a operação já esteja autorizada — confirme o
alvo:

1. Identifique o serviço (ex.: Supabase, Vercel).
2. Identifique o environment (TEST, HOMOLOGATION, PRODUCTION).
3. Confirme o project name.
4. Confirme o project ref / environment ID, quando aplicável.
5. Compare esses valores com a tabela da seção 2 (Ambientes).
6. Só então execute a operação já autorizada.

Nunca infira o target apenas pela branch, pelo diretório de trabalho, pelo
nome do projeto local ou pela última conexão utilizada — esses sinais podem
estar desatualizados ou incorretos.

Refs Supabase para conferência:

| Ambiente | Project ref |
| --- | --- |
| TEST | `oyznxaewrwgzguzanoro` |
| PRODUCTION | `uzhvuqokthtgtppkcgzu` |

Se o target não puder ser verificado inequivocamente: **PARE. BLOCKED.** Não
prossiga até confirmar o alvo por outro meio.

Verificar o target corretamente **não concede autorização** — ver seção 12.

## 12. Human Gates

**PLAN != AUTHORIZATION.** Um plano aprovado — inclusive este próprio
documento — não concede automaticamente permissão para executar uma operação
sensível.

**TARGET VERIFICATION != AUTHORIZATION.** Confirmar corretamente o alvo
(seção 11) é uma pré-condição, não uma autorização. Uma operação sensível
exige as duas coisas ao mesmo tempo: target verificado **e** autorização
explícita.

### TEST vs. PRODUCTION

TEST é o ambiente normal de validação técnica. Writes sintéticos e
controlados em TEST, necessários para testes/smoke já autorizados dentro de
uma task, não exigem um novo Human Gate para cada registro criado.

Isso não deve ser interpretado como autorização irrestrita para operações
destrutivas em TEST. Independentemente do ambiente, continuam exigindo Human
Gate explícito antes de qualquer execução:

- migrations
- schema
- RLS
- configuração de Storage
- secrets
- configuração de environment
- mudanças estruturais no Supabase
- qualquer operação em Production
- deployment
- merge em `main`
- domínio
- analytics / trackers

## 13. Riscos aceitos / Post-launch hardening backlog

Detalhados em [`SECURITY.md`](SECURITY.md). Resumo — nenhum destes deve ser
corrigido automaticamente:

- Rate limiting em memória, não distribuído.
- Ausência de malware scanning em uploads.
- Admin sem MFA.
- Ausência de revogação central de sessão admin.
- CSP com `unsafe-inline`.
- Consentimento sem ledger server-side.
- Automação de backup/restore ainda manual.
- Nomenclatura histórica `SUPABASE_SERVICE_ROLE_KEY`.
- Infrastructure drift do limite de upload (seção 7 acima).
- Hardening do cookie `Secure`/HSTS (`Secure` hoje é condicional ao protocolo
  da requisição, não forçado por ambiente) — requer análise específica antes
  de qualquer ajuste.
- `AdminRepositoryError`: a distinção entre erro de configuração, upstream e
  not-found não é surfaced na maioria dos handlers, que respondem 500
  genérico.

## 14. Conhecimento de regressões históricas

Casos já corrigidos — preservados aqui para não serem reintroduzidos:

1. **`rel="noreferrer"` quebrando CSRF** — em formulários de handoff,
   `rel="noreferrer"` removia o header `Origin` da requisição POST
   same-origin, fazendo a checagem de same-origin falhar (403). Correção:
   `rel="noopener"` apenas; a supressão de referrer para o destino externo é
   feita separadamente via `Referrer-Policy: no-referrer` na resposta de
   redirect.
2. **CSP `form-action 'self'` bloqueando redirects externos** — a CSP do
   admin precisou de uma allowlist específica em `form-action` (não em
   `connect-src`/`frame-src`) para permitir o POST-redirect a WhatsApp/iGreen.
3. **Cadeia WhatsApp** — `wa.me` redireciona para `api.whatsapp.com`; ambos
   precisam estar autorizados na CSP administrativa.
4. **Canonicalização de signed URL do Supabase** — a resposta da API de
   assinatura pode vir como `/object/sign/...`; a aplicação sempre
   canonicaliza para `/storage/v1/object/sign/...` antes de usar a URL.
5. **Redução do limite efetivo de upload para 4 MiB** — o limite anterior era
   10 MB; ver seção 7 (Known Drift) para o estado atual das camadas
   envolvidas.
6. **Compatibilidade JWT legado vs. `sb_secret_`** — ver seção 9. Enviar
   `sb_secret_` em `Authorization: Bearer` quebra a autenticação Supabase.

## 15. Decisões arquiteturais importantes

Ver [`ARCHITECTURE.md`](ARCHITECTURE.md) para o detalhamento completo. Pontos
que mais frequentemente surpreendem quem chega sem contexto:

- Upload usa Route Handler (não Server Action) por causa de controle fino
  sobre multipart, status HTTP e validação de tamanho antes do parse.
- Todas as RPCs usam `SECURITY INVOKER` + `search_path` vazio + referências
  totalmente qualificadas — defesa contra search-path hijacking.
- Um único header-builder (`server-headers.ts`) concentra toda a lógica de
  credencial Supabase, usado pelos 5 pontos de acesso server-side.
- Paginação por offset em `admin_list_leads` é uma escolha deliberada de MVP,
  não uma limitação não avaliada.

## 16. Documentação relacionada

- [`README.md`](../README.md) — visão geral e setup local.
- [`SECURITY.md`](SECURITY.md) — modelo de ameaça e controles.
- [`PRIVACY_DATA_MAP.md`](PRIVACY_DATA_MAP.md) — inventário de dados e retenção.
- [`DATA_SUBJECT_REQUESTS.md`](DATA_SUBJECT_REQUESTS.md) — atendimento a titulares.
- [`PRODUCTION_OPERATIONS.md`](PRODUCTION_OPERATIONS.md) — backup, restore, rollback.
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — roadmap de produto.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitetura de código.
- `TASK_5_SECURE_UPLOAD.md`, `TASK_6_LEAD_OPERATIONS.md`,
  `TASK_7_COMMERCIAL_HANDOFF.md`, `TASK_8_MARKETING_ATTRIBUTION.md` —
  especificações pontuais de tarefas já concluídas.
