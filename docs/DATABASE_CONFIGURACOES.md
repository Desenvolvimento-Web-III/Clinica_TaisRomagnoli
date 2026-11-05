# Modelagem de Configurações da Clínica no Cloud Firestore

Este documento descreve a modelagem NoSQL do documento centralizado de configurações da Clínica Tais Romagnoli no Cloud Firestore, em conformidade com as regras consolidadas em [`PRODUCT_RULES.md`](PRODUCT_RULES.md) e [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 1. Visão Geral da Centralização

- **Caminho do documento no Firestore:** `/configuracoes/geral`
- **Coleção:** `configuracoes`
- **ID do Documento:** `geral`
- **Permissão de Leitura:** Pública (`allow read: if true;`), permitindo que visitantes e clientes consultem contatos, políticas e regras de sinal no fluxo de agendamento sem necessidade de autenticação.
- **Permissão de Escrita:** Restrita à administração (`allow write: if isAdmin();`), garantindo que apenas usuárias autenticadas com custom claim de `admin` possam modificar as diretrizes da clínica.

---

## 2. Os Cinco Módulos Centralizados

O documento centraliza cinco dimensões essenciais para o funcionamento da clínica:

### 2.1. Contatos (`contatos`)

Centraliza todos os dados de contato institucional e endereço físico da clínica:

- `telefone` (`string`, obrigatório): Linha telefônica fixa ou móvel oficial (ex: `"(11) 98765-4321"`).
- `whatsapp` (`string`, obrigatório): Número utilizado para contato assistido e confirmações (ex: `"(11) 98765-4321"`).
- `email` (`string`, formato e-mail válido, obrigatório): E-mail oficial de atendimento (ex: `"contato@clinicataisromagnoli.com.br"`).
- `endereco` (`string`, obrigatório): Endereço do espaço físico (ex: `"Rua das Palmeiras, 450 - Sala 302, São Paulo - SP"`).

### 2.2. Sinal Financeiro (`percentualSinal`)

Define o percentual obrigatório cobrado para reserva de horários pelo cliente:

- `percentualSinal` (`number`, 0 a 100, obrigatório): Percentual padrão de sinal (padrão: `30`%).
  - Aplicado no cálculo automático de agendamentos realizados pelo app do cliente.
  - Agendamentos presenciais criados diretamente pela administradora podem receber isenção total (`sinalIsento: true`).

### 2.3. Prazos Operacionais (`prazos`)

Reúne as janelas de tempo que governam o fluxo de agendamento, cancelamento e recorrência:

- `antecedenciaMinimaAgendamentoHoras` (`number`, não negativo, padrão: `2`): Antecedência mínima para realização de um novo agendamento.
- `antecedenciaMinimaCancelamentoHoras` (`number`, não negativo, padrão: `3`): Antecedência mínima para cancelamento com aproveitamento do sinal.
- `intervaloMinutos` (`number`, inteiro não negativo, padrão: `30`): Intervalo padrão entre atendimentos para higienização e preparo da sala.
- `criterioClienteRecorrenteAtendimentosMes` (`number`, inteiro >= 1, padrão: `2`): Número de atendimentos concluídos no mesmo mês exigidos para classificação de cliente recorrente.

### 2.4. Lembretes Automáticos (`lembretes`)

Controla o disparo de notificações de lembrete pré-atendimento:

- `lembreteAtivo` (`boolean`, obrigatório): Habilita ou desativa os lembretes automáticos.
- `antecedenciaHoras` (`number`, 1 a 168 horas, padrão: `24`): Tempo de antecedência para emissão do lembrete (ex: 24 horas antes da sessão).
- `canais` (`object`, obrigatório):
  - `whatsapp` (`boolean`): Habilita envio de lembrete assistido via WhatsApp.
  - `email` (`boolean`): Habilita envio por e-mail.
  - `notificacaoApp` (`boolean`): Habilita notificação interna no painel do cliente.

### 2.5. Políticas Oficiais (`politicas`)

Centraliza os textos contratuais e parâmetros de tolerância:

- `politicaCancelamento` (`string`, min 10 caracteres): Texto oficial explicando a regra de 3 horas de antecedência, ausência de estorno em dinheiro e reaproveitamento do sinal.
- `politicaReagendamento` (`string`, min 10 caracteres): Regras e prazos para alteração de horários.
- `toleranciaAtrasoMinutos` (`number`, 0 a 120 minutos, padrão: `15`): Tempo limite de espera para chegada do cliente antes de configurar falta.

---

## 3. Campos Raiz Complementares

Para compatibilidade operacional com as Cloud Functions e o agendamento:

- `diasFolga` (`number[]`, array com dias da semana `0` a `6`): Configuração atual dos dias em que a clínica não opera (padrão: `[0, 2]`, representando Domingo e Terça-feira, configuráveis no banco e nunca fixos no código).
- `updatedAt` (`string`, ISO 8601 UTC): Data e hora da última modificação do registro.

---

## 4. Exemplo de Documento no Firestore (`configuracoes/geral`)

```json
{
  "percentualSinal": 30,
  "intervaloMinutos": 30,
  "diasFolga": [0, 2],
  "antecedenciaMinimaCancelamentoHoras": 3,
  "criterioClienteRecorrenteAtendimentosMes": 2,
  "updatedAt": "2026-09-05T00:00:00.000Z",
  "contatos": {
    "telefone": "(11) 98765-4321",
    "whatsapp": "(11) 98765-4321",
    "email": "contato@clinicataisromagnoli.com.br",
    "endereco": "Rua das Palmeiras, 450 - Sala 302, São Paulo - SP"
  },
  "politicas": {
    "politicaCancelamento": "Cancelamentos devem ser solicitados com pelo menos 3 horas de antecedência do horário agendado. Não realizamos estorno em dinheiro; o valor do sinal poderá ser reaproveitado em um novo agendamento quando o cancelamento for solicitado no prazo.",
    "politicaReagendamento": "Reagendamentos devem ser solicitados com no mínimo 3 horas de antecedência em relação ao horário original.",
    "toleranciaAtrasoMinutos": 15
  },
  "lembretes": {
    "lembreteAtivo": true,
    "antecedenciaHoras": 24,
    "canais": {
      "whatsapp": true,
      "email": true,
      "notificacaoApp": true
    }
  },
  "prazos": {
    "antecedenciaMinimaAgendamentoHoras": 2,
    "antecedenciaMinimaCancelamentoHoras": 3,
    "intervaloMinutos": 30,
    "criterioClienteRecorrenteAtendimentosMes": 2
  }
}
```

---

## 5. Resiliência e Consumo no Frontend

O serviço [`clinic-settings-service.ts`](file:///c:/Users/Carol/OneDrive/Documentos/Fatec%20Osasco%202026/Clinica_TaisRomagnoli/apps/web/src/services/clinic-settings-service.ts) implementa resiliência de três níveis:

1. **Firestore:** Consulta primária ao documento `/configuracoes/geral`.
2. **Local Storage:** Fallback em cache local (`clinica_tais_configuracoes_geral_v1`) caso o cliente esteja offline.
3. **Constante Padrão:** Fallback para [`DEFAULT_CLINIC_SETTINGS`](file:///c:/Users/Carol/OneDrive/Documentos/Fatec%20Osasco%202026/Clinica_TaisRomagnoli/packages/shared/src/constants/default-seeds.ts#L8) caso nenhum registro exista.
