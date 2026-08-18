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

- **Last verified release commit:** `a8f447ec9ad91c5e6d8df860d05abbec478c549a`
  — documentação/agent-harness apenas (`docs: establish agent source of
  truth`); não altera código runtime, migrations, Supabase ou Vercel config.
- **Data do snapshot operacional:** 2026-08-18
- **Production URL:** `https://igreen-leads.vercel.app`
- **Deployment:** `dpl_HyXeg93hZbqouVyieqhs27UCh4Gq` (target `production`,
  status `Ready`, confirmado via GitHub Deployments API — commit associado
  `a8f447ec9ad91c5e6d8df860d05abbec478c549a`, `state: success`).
- **Último smoke funcional completo:** PASS — pertence ao release funcional
  anterior (commit `d787a7c21388e0b3ee5a42fa23011a2e5c79f26c`). Nenhum código
  runtime ou migration mudou entre `d787a7c` e `a8f447e`; nenhum novo smoke
  funcional (com writes) foi executado para `a8f447e` porque não havia nada
  funcional novo para validar.
- **Verificação HTTP básica pós-deploy (read-only, sem writes):** PASS — `/`
  responde 200 sobre HTTPS com `Strict-Transport-Security`, CSP restritiva
  (`form-action 'self'` na variante pública), `X-Robots-Tag: noindex,nofollow`
  e `robots.txt` com `Disallow: /`; `/admin` sem sessão responde 307 para
  `/admin/login` com a variante de CSP admin (`form-action` inclui
  `wa.me`/`api.whatsapp.com`/`green.igreenenergy.com.br`); `GET /api/leads`
  responde 405; nenhum script Meta/GA encontrado no HTML da home; nenhum 5xx
  observado.
- **Supabase Production — verificação ao vivo (read-only):** realizada em
  2026-08-18 via SQL Editor (Data API, RLS, grants, RPCs, Storage, baseline).
  Resultado: saudável, sem contradição funcional com a documentação. Detalhes
  em §6 e §7.
- **Baseline pós-cleanup (reconfirmado ao vivo em 2026-08-18):** `leads = 0`,
  `documents = 0`, `events = 0`, `storage_objects = 0`.
- **Lançamento controlado:** `INDEXING = OFF`, `META = OFF`, `GA = OFF`,
  `CUSTOM DOMAIN = NOT CONFIGURED` — consistente com a verificação HTTP acima.

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
- **Confirmado ao vivo em Production (2026-08-18, read-only via SQL):** Data
  API expõe somente `public` (`private`/`graphql_public` não expostos);
  `private.leads`, `private.lead_documents`, `private.lead_events` com RLS
  habilitada e zero policies (deny-by-default); grants restritos a
  `service_role` (nenhum grant para `anon`/`authenticated`); as 10 RPCs da
  aplicação presentes, todas `SECURITY INVOKER` com `search_path` vazio e
  `EXECUTE` restrito a `service_role`; bucket `lead-documents` com
  `file_size_limit = 4194304` e zero policies públicas em `storage.objects`;
  Performance Advisor: 0 errors, 0 warnings, 1 info (unused index em
  `private.leads`, esperado com banco sem tráfego).

## 7. Known Drift

### 7.1 Limite de upload

**Classificação: KNOWN INFRASTRUCTURE DRIFT / REPRODUCIBILITY DEBT.**
**Não é uma falha ativa de Production.** Confirmado diretamente no runtime de
Production em 2026-08-18 (read-only via SQL) — deixa de ser uma inferência.

| Camada | Valor |
| --- | --- |
| Application (`MAX_BILL_BYTES`, código) | 4.194.304 bytes (4 MiB) |
| Storage bucket `lead-documents`, runtime em Production (confirmado ao vivo) | 4.194.304 bytes (4 MiB) |
| Storage bucket, valor definido na migration histórica | 10 MiB (10.485.760 bytes) |
| DB metadata CHECK (`lead_documents.size_bytes`) | 10 MiB (10.485.760 bytes) |

Durante o bootstrap do Supabase Production, o `file_size_limit` do bucket foi
ajustado manualmente para 4 MiB — confirmado por read-back em 2026-08-18 via
`select file_size_limit from storage.buckets where id = 'lead-documents'`. O
runtime de Production está alinhado com o limite da aplicação. A migration
versionada (`20260814015540_create_bill_upload.sql`) e o `CHECK` de metadata
no banco continuam registrando 10 MiB e não foram atualizados. Isso é débito
de reprodutibilidade: se o ambiente Production precisar ser recriado do zero a
partir das migrations, o bucket nasceria em 10 MiB até um ajuste manual
equivalente ser reaplicado. Correção (nova migration forward-only alinhando os
dois valores) está no backlog (seção 13) e requer Human Gate — não deve ser
executada apenas por constar aqui.

### 7.2 Migration version tracking

**Classificação: KNOWN MIGRATION TRACKING DRIFT / REPRODUCIBILITY DEBT.**
**Não é falha de runtime, de segurança ou de dados. Não bloqueia o Domain
Gate.** Descoberto em 2026-08-18 via consulta read-only a
`supabase_migrations.schema_migrations` em Production.

As 5 migrations aplicadas em Production têm exatamente os mesmos nomes e a
mesma ordem das 5 migrations versionadas no repositório, e o schema
resultante foi verificado como correto (RLS, grants, RPCs e Storage — ver
§6). Porém os `version` (timestamps) registrados não correspondem aos
timestamps dos filenames locais:

| Migration | Timestamp no repositório | `version` em Production |
| --- | --- | --- |
| create_lead_capture | `20260814005005` | `20260817052551` |
| create_bill_upload | `20260814015540` | `20260817052557` |
| align_bill_document_columns | `20260814021153` | `20260817052603` |
| create_admin_operations | `20260814035608` | `20260817052610` |
| add_commercial_handoff_events | `20260814165633` | `20260817052616` |

As 5 versões em Production estão a 6-7 segundos uma da outra (2026-08-17,
05:25:51–05:26:16), consistente com uma aplicação em lote única no bootstrap
do projeto, e não com a data de autoria dos arquivos no repositório.

**MIGRATION TRACKING DRIFT GUARD:** enquanto este mismatch existir, qualquer
agente ou automação que for executar `supabase db push`, `supabase migration
list`, `supabase migration repair`, ou qualquer operação de migration
tooling/sincronização contra Production deve **parar antes de executar** e
passar por um Human Gate dedicado a este mismatch especificamente. Não
reaplicar automaticamente as 5 migrations locais interpretando os timestamps
como pendentes — elas já estão aplicadas, apenas com tracking metadata
diferente. Uma eventual correção via `supabase migration repair` ou mecanismo
equivalente é uma operação de escrita em metadata, fora do escopo de qualquer
tarefa puramente documental.

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

- migrations (ver §7.2 — Migration Tracking Drift Guard antes de qualquer
  operação de migration tooling contra Production)
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
- Infrastructure drift do limite de upload (seção 7.1 acima).
- Migration tracking drift entre repositório e Production (seção 7.2 acima)
  — requer Human Gate dedicado antes de qualquer `supabase migration repair`.
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
   10 MB; ver seção 7.1 (Known Drift) para o estado atual das camadas
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
