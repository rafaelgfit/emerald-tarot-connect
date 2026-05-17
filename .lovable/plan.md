## Visão geral

Converter o sistema em SaaS por assinatura de R$ 10,00/mês via Asaas (Produção), com 30 dias de trial gratuito a partir do cadastro. Acesso ao app fica condicionado ao trial vigente ou assinatura ativa.

## Pré-requisitos (precisam de ação sua)

1. **Chave de API do Asaas (Produção)** — solicitarei via formulário seguro (`ASAAS_API_KEY`).
2. **Domínio de e-mail próprio** — para enviar lembretes via Lovable Emails. Abrirei o diálogo de configuração de domínio.
3. **Webhook do Asaas** — depois de publicar, você cola a URL pública (`/api/public/webhooks/asaas`) e um token de assinatura no painel do Asaas. Vou te guiar.

## Banco de dados

Nova tabela `subscriptions` (1:1 com usuário):
- `status`: `trialing` | `active` | `past_due` | `canceled` | `expired`
- `trial_ends_at`, `current_period_end`
- `asaas_customer_id`, `asaas_subscription_id`
- `last_payment_id`, `last_payment_status`
- Lembretes enviados (trial 10/5/1 dias) — flags booleanos
- RLS: usuário lê o próprio; service role grava (webhook)

Trigger `handle_new_user` atualizado: na criação, insere `subscriptions` com `status='trialing'` e `trial_ends_at = now() + 30 days`, e já marca `account_approvals.status='approved'` (sem aprovação manual).

Tabela `account_approvals` mantida para histórico, mas o gate de acesso passa a ser a `subscriptions`.

## Backend (server functions TanStack)

- `getMySubscription` — devolve status para a UI.
- `createAsaasSubscription` — cria customer + assinatura mensal R$10 (pix/boleto/cartão) com `notificationDisabled=false` para usar SMS/e-mail nativos do Asaas em cobranças pendentes.
- `getPaymentLink` — devolve link da próxima fatura (pix QR / boleto / cartão) para o usuário pagar.
- `cancelSubscription` — cancela no Asaas.

## Webhook Asaas (rota pública)

`src/routes/api/public/webhooks/asaas.ts` recebe eventos `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`, validando o header `asaas-access-token`. Atualiza `subscriptions.status` e `current_period_end`.

## Gate de acesso

`src/routes/_authenticated.tsx` (`beforeLoad`) — além das checagens atuais, busca `subscriptions`. Se `status` for `expired` / `past_due` / `canceled` ou trial vencido → redireciona para `/assinatura`. Superadmin continua isento.

Nova rota `/assinatura`:
- Mostra status atual, dias restantes do trial ou data da próxima cobrança.
- Botão "Assinar agora" / "Pagar fatura" com link do Asaas.
- Página fica acessível mesmo sem assinatura ativa (fora do `_authenticated`).

## Lembretes automáticos (pg_cron + server route)

`src/routes/api/public/cron/trial-reminders.ts` — autenticada por `apikey` (anon). Roda 1x/dia via pg_cron:
- Busca trials que faltam exatamente 10, 5 ou 1 dia(s) e ainda não receberam aquele lembrete.
- Envia e-mail pelo template `trial-reminder` (Lovable Emails) e marca a flag.
- Também detecta trials já expirados sem assinatura → envia template `trial-expired`.

Cobranças pendentes (pix/boleto): notificações nativas do Asaas (e-mail + SMS) — basta habilitar na conta. O webhook ainda mantém o status atualizado no nosso lado.

## E-mails (Lovable Emails)

Templates React Email:
- `trial-reminder` — usa `{days_left}` e link para `/assinatura`.
- `trial-expired` — informa fim do trial e link para pagar.
- `welcome` — opcional, no signup.

## Configurações

Página de configurações ganha aba "Assinatura" com mesmo conteúdo de `/assinatura` (status + cancelar).

## UI signup

Mensagem no `/login` (modo signup): "Você terá 30 dias grátis para testar. Depois, R$ 10/mês."

## Detalhes técnicos

```text
fluxo signup → trial 30d → lembretes 10/5/1d → /assinatura → Asaas checkout
                                                    ↓
                                              webhook → update subs
                                                    ↓
                                          gate libera acesso
```

- Asaas API base: `https://api.asaas.com/v3` (produção). Header: `access_token: ${ASAAS_API_KEY}`.
- Webhook validado por `asaas-access-token` header com secret `ASAAS_WEBHOOK_TOKEN` (solicito junto com a API key).
- Valor: cents no Asaas = `10.00`. Ciclo: `MONTHLY`. `billingType: UNDEFINED` permite o cliente escolher pix/boleto/cartão a cada fatura.

## Ordem de execução

1. Você aprova este plano.
2. Solicito secrets (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`).
3. Você configura o domínio de e-mail no diálogo que abrirei.
4. Aplico migration (tabela `subscriptions`, trigger, RLS, pg_cron).
5. Implemento server functions, webhook, página `/assinatura`, gate e e-mails.
6. Te passo a URL do webhook para colar no Asaas.
