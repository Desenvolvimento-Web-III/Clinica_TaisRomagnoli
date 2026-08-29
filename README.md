# Clínica Tais Romagnoli — fundação técnica

Monorepo que prepara o ambiente web da clínica. A entrega atual contém apenas infraestrutura local,
configurações, documentação e sinais técnicos de funcionamento; nenhuma funcionalidade do produto foi
implementada.

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

Além da fundação técnica, a branch `feature/catalogo-servicos` contém um catálogo frontend de
serviços ativos. Os dados comerciais usados nessa tela são demonstrativos e ainda não existe uma
integração real para administrá-los.

Não existem painel, agenda, pagamentos, anamnese, relatórios ou integração com WhatsApp.
