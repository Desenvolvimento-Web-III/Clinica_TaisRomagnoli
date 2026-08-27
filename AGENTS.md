# Instruções para agentes

Antes de qualquer alteração, todo agente deve:

1. Ler `README.md`, `CONTRIBUTING.md` e a documentação relevante em `docs/`.
2. Verificar `git status` e preservar o trabalho existente.
3. Nunca trabalhar diretamente na `main`; usar uma branch específica.
4. Não modificar regras de produto silenciosamente. Divergências devem ser documentadas e aprovadas.
5. Criar testes para cada nova regra ou comportamento.
6. Nunca liberar acesso administrativo pelo frontend; autorização deve existir também no backend e nas Security Rules.
7. Não criar integração real, credencial, deploy, commit ou push sem autorização explícita.
8. Executar `npm run verify` antes de concluir uma alteração.
9. Informar no relatório os arquivos alterados, as validações executadas e as pendências.

Mantenha a arquitetura proporcional ao problema. Não adicione funcionalidade do produto sem que ela esteja autorizada pelo backlog vigente.
