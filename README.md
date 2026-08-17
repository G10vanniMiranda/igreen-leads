# Conexão Green — aquisição de leads

Aplicação de aquisição e operação de leads da Conexão Green. O fluxo inclui
landing page, pré-qualificação, captura consentida, upload privado de fatura,
painel administrativo, encaminhamento comercial, atribuição e controles de
privacidade e segurança. O roadmap versionado está em
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

As políticas e os procedimentos operacionais de lançamento estão registrados em
[`docs/PRIVACY_DATA_MAP.md`](docs/PRIVACY_DATA_MAP.md),
[`docs/DATA_SUBJECT_REQUESTS.md`](docs/DATA_SUBJECT_REQUESTS.md),
[`docs/SECURITY.md`](docs/SECURITY.md) e
[`docs/PRODUCTION_OPERATIONS.md`](docs/PRODUCTION_OPERATIONS.md).

## Ambiente local

Copie `.env.example` para `.env.local` e ajuste os valores da operação. O ID de
referral é configuração pública da URL de encaminhamento, não uma credencial.

```bash
npm run dev
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```
