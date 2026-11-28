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

Portas padrão: UI `4000`, Hosting `5005`, Functions `5001`, Firestore `8080`, Auth `9099` e Storage
`9199`. Não execute `firebase use --add` nem associe um projeto real sem autorização.

Para frontend e Firebase juntos:

```bash
npm run dev:full
```

A função técnica fica no emulador em
`http://127.0.0.1:5001/demo-clinica-local/us-central1/healthCheck`.

## API do backend no Coolify

A API do Coolify atende os fluxos HTTP usados pelo frontend: disponibilidade, agendamentos,
anamnese, recorrência, indicadores, auditoria e sessão única. Para publicar no Coolify:

1. Crie uma service account dedicada e configure o JSON da chave como variável secreta de runtime
   `FIREBASE_SERVICE_ACCOUNT_JSON` no Coolify. Não salve a chave no repositório, em
   `apps/web/.env.local` nem em variáveis `VITE_*`. As rotas somente de consulta podem usar
   `roles/datastore.viewer`. Agendamentos, gravação/aprovação da anamnese, cálculo de recorrência,
   notificações e auditoria gravam no Firestore e requerem `roles/datastore.user`; esse papel amplia a
   credencial para escrita no banco inteiro. A rota de sessão única também revoga tokens no Firebase
   Authentication e precisa das permissões administrativas correspondentes. Use uma service account
   dedicada e avalie o escopo antes de conceder essas permissões. Nenhuma permissão IAM é alterada
   automaticamente pelo código.
2. Configure `CORS_ALLOWED_ORIGINS` como lista separada por vírgula das origens autorizadas, por exemplo
   `https://clinica.kndevs.tech,http://localhost:5173`.
3. Configure o build do serviço no Coolify para instalar dependências e compilar os pacotes:

   ```bash
   npm ci
   npm run build -w @clinica/shared
   npm run build -w @clinica/functions
   ```

4. No Coolify, crie um serviço Node a partir deste repositório, use a raiz do monorepo, exponha a porta
   `8080` (ou a porta definida por `PORT`) e associe o domínio da API. Configure
   `npm run start:coolify -w @clinica/functions` como comando de inicialização.
5. Configure `VITE_AVAILABILITY_API_BASE_URL` no build do frontend com a URL base da API, sem barra ao
   final. Exemplo: `https://api.example.com`.

Rotas: `GET /health`; `GET /obterHorariosDisponiveis`; `POST /salvarFichaAnamnese`;
`POST /solicitarAgendamento`; `POST /alterarAgendamento`; `POST /cancelarAgendamento`;
`POST /atualizarStatusAgendamento`; `POST /atualizarLiberacaoMedica`;
`POST /iniciarSessaoUnica`; `GET /calcularRecorrenciaCliente`;
`GET /obterPainelIndicadoresAdmin`; `GET /listarAuditoriaAdmin`.
As rotas autenticadas validam o token Firebase; operações administrativas validam o perfil no servidor.
Não use a credencial de uma conta pessoal nem exponha a chave em variáveis `VITE_*`.

Para execução local, defina `VITE_AVAILABILITY_API_BASE_URL=http://localhost:8080`. Com Firestore
Emulator, defina `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` e `GCLOUD_PROJECT=demo-clinica-local`;
nesse modo a API não exige uma chave de service account.

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
