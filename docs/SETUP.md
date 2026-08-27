# Configuração local

## Pré-requisitos

1. Instale Node.js 22.23.2 LTS. O arquivo `.nvmrc` permite `nvm use` em Linux/macOS e em gerenciadores compatíveis.
2. Use npm 10 ou superior, incluído nas versões atuais do Node 22.
3. Instale Java 21 para executar o Firebase Local Emulator Suite.
4. Abra `clinica.code-workspace` no Visual Studio Code e aceite as extensões recomendadas.

No Windows, confirme `node --version`, `npm.cmd --version` e `java -version` no PowerShell. Em Linux
e macOS, use `node --version`, `npm --version` e `java -version`. Se `java` não for encontrado, configure
`JAVA_HOME` conforme a instalação do seu sistema.

## Instalação

```bash
npm ci
npx playwright install chromium
```

Use `npm install` somente na primeira geração ou em uma alteração intencional do lockfile. O repositório
deve manter um único `package-lock.json` na raiz.

## Frontend

```bash
npm run dev:web
```

O smoke test abre normalmente sem Firebase. Para validar o SDK com emuladores, copie `.env.example`
para `apps/web/.env.local`. Os valores são fictícios e `VITE_USE_FIREBASE_EMULATORS=true` impede que
a configuração local seja confundida com uso real. A configuração deve estar completa; valores parciais
são rejeitados por Zod.

## Firebase local

```bash
npm run emulators
```

Portas padrão: UI `4000`, Hosting `5000`, Functions `5001`, Firestore `8080`, Auth `9099` e Storage
`9199`. Não execute `firebase use --add` nem associe um projeto real sem autorização.

Para frontend e Firebase juntos:

```bash
npm run dev:full
```

A função técnica fica no emulador em
`http://127.0.0.1:5001/demo-clinica-local/us-central1/healthCheck`.

## Verificações

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:rules
npm run build
npm run test:e2e
npm run verify
```

O teste de regras inicia o emulador do Firestore temporariamente e confirma que um usuário autenticado
não consegue ler nem escrever. O teste E2E exige o Chromium do Playwright. Os ícones, textos e cores do
manifesto PWA são temporários e deverão ser substituídos junto com a identidade visual.
