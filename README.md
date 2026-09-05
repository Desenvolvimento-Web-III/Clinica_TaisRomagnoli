# Clínica Tais Romagnoli — fundação técnica

Monorepo do ambiente web da clínica. A entrega atual contém a fundação técnica e as primeiras telas
demonstrativas do produto, executadas somente em ambiente local.

## Stack

Node.js 22, npm Workspaces, React, TypeScript estrito, Vite, React Router, Tailwind CSS, PWA,
Firebase Web SDK modular, Cloud Functions v2, Emulator Suite, Zod, Vitest, React Testing Library,
Playwright, Firebase Rules Unit Testing, ESLint, Prettier e GitHub Actions.

## Pré-requisitos e instalação

- Node.js 22.23.2 LTS (conforme `.nvmrc`) e npm 10 ou superior;
- Java 21 ou outra versão aceita pelo Firebase CLI, para os emuladores;
- navegador Chromium para o teste E2E.

```bash
npm ci
npx playwright install chromium
```

Para a primeira instalação, antes de existir o lockfile, use `npm install`. Consulte
[`docs/SETUP.md`](docs/SETUP.md) para instruções por sistema operacional e configuração local.

## Uso local

```bash
npm run dev          # frontend em modo desenvolvimento
npm run emulators    # Auth, Firestore, Functions, Hosting, Storage e Emulator UI
npm run dev:full     # frontend e emuladores em paralelo
npm run verify       # formatação, lint, tipos, testes, regras e builds
npm run test:e2e     # smoke test no Chromium
```

O projeto Firebase padrão é o fictício `demo-clinica-local`. Nenhum projeto real está conectado.
O frontend funciona como smoke test sem `.env`; para testar o SDK localmente, copie `.env.example`
para `apps/web/.env.local`. As chaves públicas de configuração do Firebase não substituem Security
Rules.

## Estrutura

- `apps/web`: SPA React mobile-first e PWA;
- `functions`: backend técnico em Cloud Functions de segunda geração;
- `packages/shared`: contratos puros compartilhados;
- `tests/rules`: testes das Security Rules;
- `docs`: arquitetura, segurança, escopo e decisões de produto;
- `.vscode` e `clinica.code-workspace`: ambiente do Visual Studio Code;
- `firebase.json`, `firestore.rules` e `storage.rules`: infraestrutura local Firebase.

## Situação atual

Além da fundação técnica, o frontend contém cadastro, login, catálogo de serviços ativos e uma tela
demonstrativa de agendamentos. A navegação inferior conecta serviços, agendamentos e o acesso ao
perfil. O perfil administrativo demonstrativo e somente para leitura é protegido por papel e reúne
cadastro, histórico, recorrência, pagamentos e anamnese. Os dados comerciais e pessoais usados nessas
telas são fictícios e ainda não existe integração real para administrá-los.

Não existem painel geral, agenda persistida, processamento de pagamentos, edição de anamnese,
relatórios ou integração com WhatsApp.
