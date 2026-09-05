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

## Funcionalidades futuras

Complementos de autenticação e autorização, painel administrativo geral, agenda, processamento de
pagamentos, preenchimento da ficha de avaliação/anamnese, relatórios, contato assistido por WhatsApp e
notificações serão implementados por cartões aprovados no Trello.

## Fora desta entrega

Integrações reais, modelo definitivo de dados, regras permissivas, credenciais, migrações, deploy e
automações externas permanecem fora desta entrega.
