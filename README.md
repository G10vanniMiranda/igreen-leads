# Conexão Green — aquisição de leads

Aplicação de aquisição e operação de leads da Conexão Green. O fluxo inclui
landing page, pré-qualificação, captura consentida, upload privado de fatura,
painel administrativo, encaminhamento comercial, atribuição e controles de
privacidade e segurança. O roadmap versionado está em
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

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
