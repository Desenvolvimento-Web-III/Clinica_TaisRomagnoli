# Escopo do MVP

## Decisões já fechadas

As regras consolidadas estão em [`PRODUCT_RULES.md`](PRODUCT_RULES.md): experiência mobile-first,
papéis iniciais, sinal, cancelamento, recorrência, agenda configurável, privacidade da ficha e os oito
indicadores previstos.

## Implementação em andamento

A branch `feature/catalogo-servicos` apresenta um catálogo frontend, mobile-first e somente para
leitura. A tela filtra serviços ativos e mostra nome, descrição, duração, preço e imagem.

Os nomes, as durações e os valores atuais são demonstrativos, porque o catálogo comercial oficial e
o modelo de dados ainda não foram fornecidos. Eles devem ser validados antes de qualquer publicação
para clientes reais. Seleção de serviço, agendamento e administração do catálogo não fazem parte
desta entrega.

A branch `feature/perfil-administrativo-cliente` adiciona uma primeira versão demonstrativa e somente
para leitura do perfil administrativo do cliente. A tela consolida cadastro, histórico de atendimentos,
recorrência, pagamentos e anamnese. A recorrência segue a regra de dois atendimentos concluídos no
mesmo mês. Os dados exibidos são fictícios; integração com dados reais e operações de escrita continuam
fora do escopo até a validação do modelo definitivo.

A tela “Meus agendamentos” apresenta dados demonstrativos e interações somente locais. Sua barra
inferior conecta o catálogo, os agendamentos e o login disponível como entrada para o futuro perfil do
cliente. Cadastro e login bem-sucedidos direcionam para essa tela. Persistência, seleção definitiva de
serviço, disponibilidade de horários e processamento de cancelamento continuam fora desta entrega.

Uma sessão autenticada pode ser encerrada pela ação “Sair”. O frontend usa o Firebase Auth para
encerrar a sessão, limpa o usuário mantido no estado da aplicação e redireciona para o catálogo público
de serviços.

As telas compartilham a identidade visual definida no brandbook, com navegação adaptada para mobile e
desktop, componentes acessíveis, áreas de toque adequadas e conteúdo limitado para manter boa leitura
em telas amplas. Quando há uma sessão ativa, o cabeçalho identifica o usuário pelo nome do perfil de
autenticação e oferece a ação de logout; contas antigas sem nome usam uma apresentação derivada do
e-mail até que o perfil seja atualizado.

## Funcionalidades futuras

Complementos de autenticação e autorização, painel administrativo geral, agenda, processamento de
pagamentos, preenchimento da ficha de avaliação/anamnese, relatórios, contato assistido por WhatsApp e
notificações serão implementados por cartões aprovados no Trello.

## Fora desta entrega

Integrações reais, modelo definitivo de dados, regras permissivas, credenciais, migrações, deploy e
automações externas permanecem fora desta entrega.
