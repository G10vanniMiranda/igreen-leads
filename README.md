# Conexão Green — aquisição de leads

Fundação da aplicação de aquisição e pré-qualificação de leads da Conexão
Green. Esta etapa contém apenas o shell visual e a configuração tipada da
integração de encaminhamento.

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
npm run build
```
