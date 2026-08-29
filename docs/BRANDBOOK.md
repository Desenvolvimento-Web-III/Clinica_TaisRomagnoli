# Brandbook — Tais Romagnoli Massoterapia

Guia de identidade verbal, visual e de interface do sistema de agendamentos.

**Versão:** 1.0<br>
**Data:** 28 de agosto de 2026<br>
**Caminho no projeto:** `docs/BRANDBOOK.md`

## 1. Objetivo deste documento

Este brandbook transforma a referência visual do protótipo e a tela de cadastro já implementada em regras reutilizáveis para toda a aplicação.

Ele deve orientar designers, pessoas desenvolvedoras, redatores e agentes de IA na criação de novas telas, componentes e mensagens sem descaracterizar a marca.

### Fontes usadas nesta versão

- Protótipo visual fornecido com as telas de cadastro, login, ficha de anamnese e serviços.
- Implementação da branch `feature/cadastro-cliente`, principalmente:
  - `apps/web/src/pages/RegisterPage.tsx`;
  - `apps/web/src/styles/index.css`;
  - `apps/web/index.html`.
- Regras registradas em:
  - `docs/PRODUCT_RULES.md`;
  - `docs/MVP_SCOPE.md`;
  - `docs/ARCHITECTURE.md`.

## 2. Identidade da marca

### 2.1 Nome

| Contexto                        | Forma recomendada                                   |
| ------------------------------- | --------------------------------------------------- |
| Marca apresentada ao público    | Tais Romagnoli — Massoterapia                       |
| Nome curto                      | Tais Romagnoli                                      |
| Nome interno do produto/projeto | Clínica Tais Romagnoli                              |
| Descrição funcional             | Sistema de agendamentos para espaço de massoterapia |

Não usar “ACAT” como parte da marca apresentada ao cliente. ACAT identifica o contexto acadêmico e a consultoria do projeto, não o espaço de massoterapia.

### 2.2 Propósito

Facilitar o acesso aos serviços de massoterapia e tornar o agendamento simples, seguro e transparente para clientes e administradora.

### 2.3 Promessa central

Cuidado e organização desde o primeiro contato.

### 2.4 Posicionamento

A marca deve ocupar o espaço entre acolhimento humano e organização profissional. A experiência não deve parecer hospitalar, burocrática ou excessivamente mística. Também não deve parecer um aplicativo genérico de agenda.

### 2.5 Personalidade

| A marca é    | A marca não é |
| ------------ | ------------- |
| Acolhedora   | Infantil      |
| Serena       | Lenta ou vaga |
| Clara        | Burocrática   |
| Responsável  | Alarmista     |
| Próxima      | Invasiva      |
| Profissional | Hospitalar    |
| Delicada     | Frágil        |

## 3. Princípios da experiência

- **Simples antes de completo:** cada tela deve ajudar o cliente a concluir uma tarefa sem distrações.
- **Cuidado sem ansiedade:** mensagens de saúde, pagamento e cancelamento devem ser objetivas e respeitosas.
- **Confiança visível:** valores, regras, horários e consequências precisam aparecer antes da confirmação.
- **Mobile primeiro:** a interface deve funcionar com conforto desde 320 px de largura.
- **Privacidade por padrão:** dados pessoais e respostas da ficha de anamnese não são elementos decorativos nem devem aparecer fora do contexto necessário.
- **Autonomia com orientação:** o cliente executa o fluxo sozinho, mas nunca fica sem saber o próximo passo.

## 4. Assinatura visual e símbolo

O símbolo de referência mostra uma figura feminina meditando, combinada com mandala, linhas fluidas e uma base semelhante a páginas ou ondas. Ele comunica equilíbrio, acolhimento e bem-estar.

### 4.1 Usos recomendados

- Tela de login, abertura e materiais institucionais.
- Cabeçalhos com espaço suficiente para o símbolo respirar.
- Fundo branco ou lavanda muito claro.
- Versão completa com largura mínima recomendada de 120 px em telas digitais.
- Símbolo reduzido somente quando houver uma versão simplificada aprovada; mínimo recomendado de 32 px.

### 4.2 Área de proteção

Manter ao redor do símbolo uma área livre equivalente a pelo menos 25% de sua altura. Em interfaces pequenas, nunca usar menos de 16 px de respiro.

### 4.3 Usos proibidos

- Esticar, comprimir, inclinar ou recortar o símbolo.
- Aplicar sombra pesada, contorno ou brilho externo.
- Posicionar sobre fotografia com baixo contraste.
- Trocar as cores individualmente sem uma variante aprovada.
- Usar o símbolo repetidamente como enfeite de fundo.
- Misturar o símbolo com ícones funcionais.

### 4.4 Pendência do arquivo mestre

O protótipo fornecido permite definir o comportamento da marca, mas não substitui o arquivo mestre do logotipo. Quando o SVG ou vetor definitivo for exportado, suas cores internas e proporções passam a ser a fonte oficial. Não extrair cores aproximadas de screenshots para reconstruir o símbolo.

## 5. Paleta de cores

### 5.1 Paleta principal

| Token sugerido   | Hex       | Papel                                                     |
| ---------------- | --------- | --------------------------------------------------------- |
| `brand-soft`     | `#EDE9FE` | Fundo principal, áreas de acolhimento e superfícies leves |
| `brand-primary`  | `#8F75D0` | Cor expressiva da marca, foco, ícones ativos e detalhes   |
| `brand-strong`   | `#7A60B8` | Botões primários com texto branco e cabeçalhos sólidos    |
| `brand-deep`     | `#6C53A6` | Links, estado ativo e ênfase acessível sobre fundo claro  |
| `surface`        | `#FFFFFF` | Cards, formulários, modais e conteúdo principal           |
| `text-primary`   | `#000000` | Títulos e conteúdo de maior prioridade                    |
| `text-secondary` | `#334155` | Labels, textos de apoio e conteúdo secundário             |
| `border-default` | `#E2E8F0` | Bordas de campos e divisores                              |
| `icon-muted`     | `#94A3B8` | Ícones puramente auxiliares e não interativos             |
| `canvas-neutral` | `#F8FAFC` | Fundos neutros alternativos e metadados do navegador      |

### 5.2 Cores de estado

| Estado     | Fundo     | Texto/ícone | Borda     |
| ---------- | --------- | ----------- | --------- |
| Sucesso    | `#ECFDF5` | `#065F46`   | `#A7F3D0` |
| Erro       | `#FEF2F2` | `#B91C1C`   | `#EF4444` |
| Aviso      | `#FFFBEB` | `#92400E`   | `#FCD34D` |
| Informação | `#EFF6FF` | `#1E40AF`   | `#BFDBFE` |

As cores de estado são funcionais. Não usar vermelho, verde, amarelo ou azul apenas como decoração.

### 5.3 Regras de contraste

- O texto normal deve atingir contraste mínimo de 4,5:1.
- Texto grande deve atingir no mínimo 3:1.
- Bordas de foco e elementos interativos devem atingir no mínimo 3:1 contra o entorno.
- Informação nunca deve depender apenas da cor.

Contrastes relevantes da paleta:

| Combinação                               | Contraste | Resultado                      |
| ---------------------------------------- | --------- | ------------------------------ |
| Branco sobre `brand-primary` (`#8F75D0`) | 3,73:1    | Não usar em texto pequeno      |
| Branco sobre `brand-strong` (`#7A60B8`)  | 5,01:1    | Aprovado para texto normal     |
| Branco sobre `brand-deep` (`#6C53A6`)    | 6,13:1    | Aprovado                       |
| `brand-deep` sobre branco                | 6,13:1    | Aprovado para links            |
| `text-secondary` sobre branco            | 10,35:1   | Aprovado                       |
| `icon-muted` sobre branco                | 2,56:1    | Apenas decoração não essencial |

Por isso, `brand-primary` continua sendo a cor visual da marca, mas `brand-strong` deve ser o fundo padrão de botões com texto branco. Links de texto devem usar `brand-deep`.

### 5.4 Tokens CSS recomendados

```css
:root {
  --color-brand-soft: #ede9fe;
  --color-brand-primary: #8f75d0;
  --color-brand-strong: #7a60b8;
  --color-brand-deep: #6c53a6;

  --color-surface: #ffffff;
  --color-canvas-neutral: #f8fafc;
  --color-text-primary: #000000;
  --color-text-secondary: #334155;
  --color-border-default: #e2e8f0;
  --color-icon-muted: #94a3b8;

  --color-success-bg: #ecfdf5;
  --color-success-text: #065f46;
  --color-success-border: #a7f3d0;
  --color-error-bg: #fef2f2;
  --color-error-text: #b91c1c;
  --color-error-border: #ef4444;
}
```

Não espalhar novos valores hexadecimais diretamente nas páginas. Novas cores devem entrar primeiro na lista de tokens semânticos.

## 6. Tipografia

### 6.1 Família principal

Inter é a tipografia oficial da interface, com fallback para `ui-sans-serif`, `system-ui`, `Segoe UI` e fontes sem serifa do sistema.

Pesos permitidos:

- **400** — texto corrido;
- **500** — labels e informações com ênfase leve;
- **600** — botões e títulos de seção;
- **700** — títulos principais e links de alta prioridade.

Evitar pesos 800 e 900. A marca deve transmitir segurança sem parecer agressiva.

### 6.2 Escala recomendada

| Uso                      | Tamanho/linha | Peso                  |
| ------------------------ | ------------- | --------------------- |
| Título principal da tela | 24/32 px      | 700                   |
| Título de seção          | 18/28 px      | 600                   |
| Título de card           | 16/24 px      | 600                   |
| Texto padrão             | 14/20 px      | 400                   |
| Label de formulário      | 14/20 px      | 500                   |
| Botão                    | 14/20 px      | 600                   |
| Ajuda, erro ou metadado  | 12/16 px      | 500 quando necessário |

Não usar texto menor que 12 px. Textos essenciais e orientações longas devem preferir 14 ou 16 px.

### 6.3 Escrita visual

- Usar capitalização de frase: “Criar conta”, não “CRIAR CONTA”.
- Não usar todas as letras maiúsculas em títulos ou botões.
- Títulos devem ser curtos e descrever a tarefa.
- Manter alinhamento à esquerda em conteúdo; centralizar somente títulos curtos, confirmações e chamadas simples.

## 7. Espaçamento e composição

### 7.1 Grade

Usar base de 4 px com preferência por múltiplos de 8 px.

| Token      | Valor | Uso comum                                |
| ---------- | ----- | ---------------------------------------- |
| `space-1`  | 4 px  | Relação imediata entre label e campo     |
| `space-2`  | 8 px  | Ícone e texto, conteúdo compacto         |
| `space-3`  | 12 px | Padding interno pequeno                  |
| `space-4`  | 16 px | Margem lateral mobile e separação padrão |
| `space-5`  | 20 px | Distância entre campos de formulário     |
| `space-6`  | 24 px | Padding de card mobile                   |
| `space-8`  | 32 px | Padding amplo e separação de blocos      |
| `space-10` | 40 px | Seções de maior destaque                 |
| `space-12` | 48 px | Separação entre áreas independentes      |

### 7.2 Layout de autenticação

Base extraída da tela de cadastro:

- viewport com altura mínima de `100dvh`;
- conteúdo centralizado;
- padding externo de 16 px na horizontal e 32 px na vertical;
- card com largura de 100% e máximo de 448 px;
- padding interno de 24 px no mobile e 32 px a partir de 640 px;
- 32 px entre título e formulário;
- 20 px entre campos.

### 7.3 Densidade

A interface deve respirar, mas não desperdiçar espaço. Em celulares menores, priorizar rolagem vertical simples em vez de reduzir fontes e áreas de toque.

## 8. Bordas, raios e sombras

### 8.1 Raios

| Token         | Valor | Uso                                |
| ------------- | ----- | ---------------------------------- |
| `radius-sm`   | 8 px  | Alertas e chips pequenos           |
| `radius-md`   | 12 px | Inputs e botões                    |
| `radius-lg`   | 16 px | Cards de serviço e blocos internos |
| `radius-xl`   | 24 px | Cabeçalhos ou painéis de destaque  |
| `radius-auth` | 32 px | Card principal de autenticação     |

O raio de 32 px é uma assinatura de acolhimento para cards principais. Não aplicar em todos os elementos.

### 8.2 Bordas

- Padrão: 1 px com `border-default`.
- Foco: borda `brand-primary` acompanhada de anel visível.
- Erro: borda `error-border` e mensagem textual associada.
- Evitar bordas pretas ou espessas em formulários comuns.

### 8.3 Sombras

Usar sombras leves e difusas. O card deve parecer apoiado sobre o fundo, não flutuando muito acima dele.

```css
--shadow-card: 0 1px 3px rgb(15 23 42 / 0.08);
--shadow-elevated: 0 8px 24px rgb(76 61 116 / 0.12);
```

Não usar sombras coloridas fortes, múltiplas camadas pesadas ou efeito neon.

## 9. Iconografia

- O padrão atual usa ícones lineares e simples.
- Tamanho padrão em campos: 20 × 20 px.
- Espessura de traço: aproximadamente 1,5 px.
- Cantos e terminações arredondados.
- Cor padrão auxiliar: `icon-muted`.
- Cor de ícone interativo: `text-secondary` ou `brand-deep`.
- Ícones devem usar `currentColor` para herdar estados corretamente.
- Não misturar ícones preenchidos, emojis e ilustrações detalhadas no mesmo conjunto funcional. Emojis podem existir em comunicação informal, mas não substituem ícones de navegação.
- Todo ícone sem texto deve possuir nome acessível. Ícones decorativos devem ser ignorados por leitores de tela.

## 10. Fotografia e ilustração

### 10.1 Direção fotográfica

- Luz natural ou suave.
- Tons neutros, lavanda e azul-violeta discretos.
- Ambiente organizado e acolhedor.
- Enquadramentos respeitosos dos procedimentos.
- Preferência por imagens reais da profissional, do espaço e dos serviços, com autorização de uso.

### 10.2 Cards de serviço

- Usar proporção consistente entre todas as imagens.
- Não colocar texto essencial diretamente sobre uma área visualmente carregada.
- Quando houver texto sobre foto, aplicar overlay uniforme e validar o contraste.
- Nome, duração e preço devem continuar legíveis fora da imagem sempre que possível.

### 10.3 Evitar

- Banco de imagens com aparência excessivamente artificial.
- Imagens erotizadas ou que exponham o cliente de forma desconfortável.
- Comparações de “antes e depois” sem contexto e autorização.
- Elementos médicos que façam o serviço parecer diagnóstico hospitalar.
- Promessas visuais ou textuais de cura garantida.

## 11. Componentes de interface

### 11.1 Fundo de página

- Fundo padrão de fluxos acolhedores: `brand-soft`.
- Conteúdo principal deve ficar em `surface`.
- Telas com navegação podem usar cabeçalho `brand-strong` e corpo branco.

### 11.2 Card principal

- Fundo branco.
- Raio de 24 a 32 px.
- Sombra leve.
- Padding mínimo de 24 px.
- Um objetivo principal por card.

### 11.3 Campo de formulário

- Altura mínima interativa: 44 px.
- Raio: 12 px.
- Borda: `border-default`.
- Label sempre visível acima do campo.
- Placeholder é exemplo, nunca substituto do label.
- Ícone auxiliar à esquerda com 20 px.
- Ações como mostrar senha devem possuir área de toque de pelo menos 44 × 44 px.

Estados:

| Estado       | Aparência                                                  |
| ------------ | ---------------------------------------------------------- |
| Padrão       | Fundo branco e borda `border-default`                      |
| Foco         | Borda `brand-primary` e anel com transparência             |
| Preenchido   | Mesmo padrão, mantendo legibilidade                        |
| Erro         | Borda vermelha, ícone opcional e mensagem específica       |
| Desabilitado | Fundo neutro, texto legível e aparência claramente inativa |

### 11.4 Botão primário

- Fundo padrão: `brand-strong`.
- Texto: branco, 14 px, peso 600.
- Altura mínima: 44 px.
- Raio: 12 px.
- Largura total em formulários mobile.
- Hover/pressed: `brand-deep`.
- Foco: anel visível, sem depender apenas da mudança de fundo.
- Texto deve iniciar com verbo: “Criar conta”, “Continuar agendamento”, “Confirmar horário”.

Não usar `brand-primary` com texto branco pequeno como padrão do botão, pois essa combinação não alcança contraste AA.

### 11.5 Botão secundário

- Fundo branco.
- Texto e borda `brand-deep`.
- Mesmo tamanho e raio do botão primário quando ambos tiverem importância semelhante.

### 11.6 Links

- Usar `brand-deep` sobre branco.
- Peso 600 ou 700 quando fizer parte da ação principal da frase.
- Exibir sublinhado no hover e no foco.
- Não usar apenas a cor para diferenciar links em blocos longos de texto.

### 11.7 Alertas e validação

- Mensagem curta, específica e próxima do campo.
- Explicar o que aconteceu e como corrigir.
- Usar ícone ou texto além da cor.
- Alertas gerais podem usar fundo suave, borda e texto escuro.

Exemplos:

- Bom: “Informe um e-mail válido, como nome@exemplo.com.”
- Bom: “As senhas não coincidem.”
- Evitar: “Erro.”
- Evitar: “Dados inválidos.”

### 11.8 Ficha de anamnese

- Uma pergunta por bloco visual.
- Linguagem neutra e sem julgamento.
- Explicar por que informações sensíveis são solicitadas.
- Opções “Sim” e “Não” com rótulo textual e área de toque adequada.
- Não deixar uma resposta selecionada apenas pela diferença de cor.
- Indicar progresso quando a ficha tiver várias etapas.
- Título recomendado: Ficha de anamnese ou Ficha de avaliação. Evitar “Ficha Anamnese”.

### 11.9 Cards de serviço

Cada card deve apresentar, nesta ordem:

1. nome do serviço;
2. descrição curta;
3. duração;
4. preço;
5. ação de seleção.

O preço deve usar o padrão brasileiro, por exemplo R$ 120,00. A duração deve ser direta, por exemplo 60 min.

### 11.10 Navegação inferior

- Usar entre três e cinco destinos principais.
- Ícone e label sempre juntos.
- Item ativo em `brand-deep` ou `brand-strong`.
- Item inativo deve manter contraste suficiente; preferir `#64748B` a `icon-muted` para labels.
- Respeitar a área segura do aparelho.

## 12. Tom de voz

### 12.1 Características

O texto da aplicação deve ser:

- acolhedor, sem excesso de intimidade;
- objetivo, sem termos técnicos desnecessários;
- calmo, especialmente em erros, pagamentos e saúde;
- responsável, sem prometer resultados clínicos;
- orientado à ação.

### 12.2 Vocabulário preferido

| Preferir             | Evitar                                                       |
| -------------------- | ------------------------------------------------------------ |
| Cliente              | Paciente, quando não houver contexto clínico formal          |
| Sessão               | Procedimento, quando o termo deixar a experiência hospitalar |
| Serviço              | Produto                                                      |
| Profissional         | Operador                                                     |
| Ficha de anamnese    | Questionário médico genérico                                 |
| Sinal de 30%         | Taxa, multa ou cobrança surpresa                             |
| Reagendamento        | Troca aleatória de horário                                   |
| Horário indisponível | Erro de agenda                                               |

### 12.3 Regras de microcopy

- Usar “E-mail”, com hífen.
- Usar frases curtas e voz ativa.
- Explicar consequências antes da confirmação.
- Não culpar o cliente por um erro.
- Informar o próximo passo.
- Não usar piadas em mensagens sobre saúde, privacidade, pagamento ou cancelamento.

### 12.4 Exemplos

| Situação                     | Texto recomendado                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Cadastro concluído           | “Conta criada com sucesso. Agora você pode continuar seu agendamento.”                              |
| Horário ocupado              | “Este horário acabou de ser reservado. Escolha uma das opções disponíveis.”                         |
| Sinal                        | “Para confirmar o horário, é necessário pagar 30% do valor da sessão.”                              |
| Cancelamento dentro do prazo | “Você pode usar o valor do sinal em um novo agendamento.”                                           |
| Cancelamento tardio          | “Como faltam menos de três horas para a sessão, o valor do sinal não poderá ser reutilizado.”       |
| Pergunta sensível            | “Esta informação ajuda a profissional a avaliar se o atendimento pode ser realizado com segurança.” |

### 12.5 Alegações que não devem ser usadas

- “Cura garantida.”
- “Resultado imediato para todos.”
- “Elimina qualquer dor.”
- “Substitui acompanhamento médico.”
- Qualquer promessa absoluta de saúde ou resultado.

## 13. Acessibilidade

Toda nova tela deve atender, no mínimo, ao nível AA das WCAG aplicável ao produto.

Checklist obrigatório:

- Contraste de texto normal igual ou superior a 4,5:1.
- Área de toque com pelo menos 44 × 44 px.
- Navegação completa por teclado.
- Foco sempre visível.
- Labels associados programaticamente aos campos.
- Erros associados ao respectivo campo e anunciados por tecnologia assistiva.
- Ordem de leitura igual à ordem visual.
- Texto alternativo em imagens informativas.
- Ícones decorativos ocultos de leitores de tela.
- Não depender apenas de cor, posição ou ícone para transmitir estado.
- Respeitar `prefers-reduced-motion` em animações.
- Zoom de até 200% sem perda de conteúdo ou função.

## 14. Responsividade

### Mobile

- Base do produto.
- Largura mínima suportada: 320 px.
- Padding lateral padrão: 16 px.
- Ações principais em largura total quando isso simplificar o fluxo.
- Uma coluna para formulários e cards de decisão.

### Tablet e desktop

- Não esticar formulários indefinidamente.
- Autenticação limitada a 448 px.
- Listas e serviços podem usar múltiplas colunas quando houver espaço.
- Manter hierarquia, escala e distâncias da versão mobile.

## 15. Movimento e feedback

- Duração recomendada: 150 a 250 ms.
- Usar transições para foco, hover, abertura de mensagens e mudança de etapa.
- Evitar movimentos contínuos, saltos e animações chamativas em formulários.
- Toda ação assíncrona deve mostrar carregamento e impedir envio duplicado.
- Feedback de sucesso deve confirmar a ação e indicar o próximo passo.

## 16. Privacidade aplicada à marca

O cuidado visual precisa ser acompanhado de cuidado com os dados.

- Não exibir respostas da anamnese em cards, notificações ou resumos públicos.
- Não revelar nomes de outros clientes em conflitos de horário.
- Não usar informações pessoais reais em screenshots de demonstração.
- Não usar dados de saúde em textos promocionais.
- Mensagens de erro não devem confirmar se determinado e-mail ou telefone pertence a outra pessoa além do necessário para o fluxo seguro.

## 17. Fonte de verdade e manutenção

Após a inclusão deste arquivo no projeto, a ordem de referência deve ser:

1. `docs/BRANDBOOK.md` para regras de marca, linguagem e direção visual;
2. tokens semânticos centrais para valores implementados;
3. componentes compartilhados para comportamento visual;
4. protótipo aprovado para composição e fluxo;
5. páginas individuais apenas como exemplo, nunca como nova fonte isolada de tokens.

Toda alteração de cor, tipografia, raio, tom de voz ou comportamento de componente deve atualizar primeiro este documento ou os tokens centrais. Evitar copiar valores diretamente de screenshots.

## 18. Aplicação imediata na base atual

Para alinhar a implementação da branch ao brandbook:

- centralizar os valores hexadecimais em tokens semânticos;
- trocar o fundo padrão do botão com texto branco de `#8F75D0` para `#7A60B8`;
- usar `#6C53A6` nos links de texto sobre branco;
- manter `#8F75D0` em foco, ícones ativos e elementos expressivos;
- usar `#B91C1C` para textos de erro e `#EF4444` para bordas;
- aumentar ações de mostrar senha para área de toque mínima de 44 × 44 px;
- substituir “Email” por “E-mail” nas labels;
- atualizar o `theme-color` do PWA quando os cabeçalhos da marca forem implementados;
- criar componentes compartilhados antes de repetir inputs, botões e alertas em novas telas.

## 19. Checklist para novas telas

Antes de considerar uma tela pronta, verificar:

- Usa apenas tokens de cor aprovados.
- Mantém Inter e a escala tipográfica definida.
- Possui um objetivo principal claro.
- Funciona a partir de 320 px.
- Campos têm labels visíveis.
- Ações têm pelo menos 44 × 44 px.
- Foco de teclado está visível.
- Contraste foi validado.
- Erros explicam como corrigir.
- Textos seguem o tom acolhedor, direto e responsável.
- Não expõe informações pessoais ou de saúde.
- Estados de carregamento, sucesso, vazio e erro foram considerados.
- A tela não introduz novos hexadecimais, raios ou sombras sem documentação.

Este brandbook é a base visual e verbal do MVP. O símbolo definitivo deve ser atualizado neste documento quando o arquivo vetorial oficial estiver disponível.
