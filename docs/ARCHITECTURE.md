# Arquitetura

## Visão geral

O frontend é uma SPA React mobile-first, distribuível como PWA pelo Vite. Firebase fornece
Authentication, Firestore e Storage. A API HTTP de disponibilidade roda como serviço Node separado no
Coolify para que o cálculo não dependa da implantação de Cloud Functions. A execução local usa o
projeto fictício `demo-clinica-local` e o Emulator Suite.

O código do frontend será organizado por `features` conforme o produto crescer. Elementos realmente
genéricos ficam em `components/ui`, enquanto acesso ao Firebase fica em `lib/firebase`. O backend em
Functions permanece disponível para operações privilegiadas. Contratos puros comuns ao frontend e
backend ficam em `@clinica/shared`; componentes React, Firebase e infraestrutura não.

Solicitações iniciais de agendamento podem ser gravadas pelo SDK web diretamente em
`/agendamentos`, com validação nas Security Rules contra o perfil do cliente e o serviço ativo. Esse
fluxo só cria registros `pendente`; a confirmação, a prevenção de conflitos entre horários e as
validações clínicas dependem de backend confiável e não são garantidas pelas regras do Firestore.
Preço e duração são snapshots da leitura normalizada do catálogo no cliente; por isso, uma solicitação
pendente deve ser revisada pela administradora antes de qualquer confirmação.
O endpoint de disponibilidade no Coolify consulta no servidor os agendamentos, bloqueios e horários
fixos; ao navegador retorna somente os slots livres, sem dados pessoais de outros clientes.

As telas administrativas de bloqueios de agenda e horários fixos leem e gravam diretamente em
`/bloqueios_agenda` e `/horarios_fixos` pelo SDK web. Essas coleções são autorizadas nas Security
Rules: a criação valida o formato do registro e o perfil do cliente, e somente a administradora pode
alterar ou excluir registros. O frontend não usa as Cloud Functions correspondentes, que continuam
no backend mas não estão implantadas no projeto Firebase atual.

## Autorização futura

A proteção deverá existir em quatro níveis complementares: interface, rotas, backend confiável e Firebase
Security Rules. Ocultar elementos no navegador não constitui autorização. Os papéis iniciais são
`admin` e `client`; o papel `professional` poderá ser criado futuramente. Custom Claims serão atribuídas
somente pelo backend.

O início prevê uma profissional, mas entidades dependentes de profissional deverão estar preparadas
para `professionalId`, sem prender o domínio a uma única pessoa. O modelo de dados definitivo ainda
não foi validado. Somente os caminhos necessários às entregas aprovadas são abertos nas regras: o
cadastro básico pode ser consultado pelo proprietário e pela administradora; histórico e pagamentos
do perfil administrativo são restritos à administradora; e a anamnese pode ser lida apenas pelo
cliente proprietário e pela administradora. As demais operações continuam bloqueadas por padrão.
