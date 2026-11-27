# Segurança

- A autorização será baseada em papéis. Os papéis iniciais previstos são `admin` e `client`.
- Custom Claims serão atribuídas exclusivamente por backend confiável, nunca pelo frontend. Para
  compatibilidade com a base existente, Security Rules também reconhecem como administradora a
  conta autenticada cujo UID tenha um documento `/admins/{uid}` com `role: "admin"`. Essa coleção
  permanece sem escrita client-side (deny all); sua manutenção deve ocorrer pelo Console Firebase
  ou por backend confiável.
- A rota administrativa será protegida na interface e no roteamento, sem depender apenas disso.
- Operações privilegiadas validarão autenticação e autorização nas Functions.
- Firestore e Storage terão autorização independente nas Security Rules.
- A ficha de avaliação terá acesso restrito ao cliente proprietário e à administradora.
- Service accounts, chaves privadas, tokens administrativos e segredos de pagamento são proibidos no frontend.
- O cadastro básico é legível pelo cliente proprietário e pela administradora; listagens são
  administrativas.
- Histórico e pagamentos do perfil administrativo são legíveis somente pela administradora.
- A anamnese é legível somente pelo cliente proprietário e pela administradora.
- Escritas em histórico, pagamentos e anamnese permanecem bloqueadas até a validação dos fluxos
  responsáveis por esses dados.
- Todo caminho não autorizado explicitamente permanece `deny all`.
- Configurações públicas do Firebase identificam o projeto, mas não substituem Security Rules.
- A criação direta de agendamentos aceita somente solicitações pendentes, valida titular/admin,
  dados pessoais copiados do perfil e a existência/atividade do serviço. Como o catálogo ainda possui
  formatos legados de preço/duração, esses valores são snapshots enviados pelo cliente e precisam ser
  conferidos pela administradora. As regras não confirmam horário livre, ficha médica nem pagamento.
- A única atualização direta permitida em `/agendamentos` consome um crédito de sinal em uma transação
  que também cria o novo pedido: o registro de origem precisa pertencer ao mesmo cliente, estar
  cancelado no prazo, ter sinal confirmado e crédito disponível. A regra vincula origem e destino e
  recusa uma segunda utilização. Demais atualizações e exclusões continuam bloqueadas.
- A fila de lembretes assistidos grava somente o status, mensagem personalizada e data do agendamento
  em `/fila_lembretes/{agendamentoId}`. A leitura e a escrita são exclusivas da administradora nas
  Security Rules; clientes e usuários anônimos não podem acessar a fila. O contato permanece manual,
  iniciado pela administradora no WhatsApp, sem automação ou Cloud Functions.

LGPD, consentimento, retenção, minimização de dados, trilhas de auditoria e resposta a incidentes são
requisitos futuros que deverão ser detalhados antes do tratamento de dados reais.
