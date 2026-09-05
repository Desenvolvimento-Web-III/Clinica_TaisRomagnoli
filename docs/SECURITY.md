# Segurança

- A autorização será baseada em papéis. Os papéis iniciais previstos são `admin` e `client`.
- Custom Claims serão atribuídas exclusivamente por backend confiável, nunca pelo frontend.
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

LGPD, consentimento, retenção, minimização de dados, trilhas de auditoria e resposta a incidentes são
requisitos futuros que deverão ser detalhados antes do tratamento de dados reais.
