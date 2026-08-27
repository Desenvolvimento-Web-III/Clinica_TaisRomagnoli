# Contribuição

Trabalhe em uma branch dedicada, mantenha mudanças pequenas e siga as decisões registradas em `docs/`.
Use Node.js 22, instale com `npm ci` quando houver lockfile e não versione arquivos `.env`.

Antes de solicitar revisão, execute:

```bash
npm run verify
npm run test:e2e
```

Qualquer mudança de regra de produto ou acesso a serviço real precisa de aprovação explícita. Commits,
pushes e deploys não fazem parte do fluxo automático deste workspace.
