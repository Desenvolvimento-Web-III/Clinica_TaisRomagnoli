# Modelagem de Agendamentos no Cloud Firestore

Este documento descreve a modelagem oficial de dados da coleção de agendamentos no Cloud Firestore da Clínica Tais Romagnoli, em conformidade com as regras de negócio registradas em [`PRODUCT_RULES.md`](PRODUCT_RULES.md) e as diretrizes arquiteturais de [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 1. Visão Geral da Coleção

- **Caminho da coleção raiz:** `/agendamentos/{agendamentoId}`
- **Subcoleção opcional do cliente:** `/clientes/{uid}/agendamentos/{agendamentoId}`
- **Padrão de identificador:** `ag-{timestamp}-{hash}` (ou UUID gerado pelo backend)
- **Origem de escrita:** Exclusiva via Cloud Functions (Admin SDK). Escritas diretas client-side são bloqueadas pelas regras de segurança.

---

## 2. As Seis Dimensões Modeladas

A entidade de agendamento consolida seis dimensões fundamentais:

### 2.1. Cliente

Representa o cliente titular do atendimento, permitindo vínculo seguro com o Firebase Auth e a coleção `/clientes/{uid}`:

- `clienteId` (`string`, obrigatório): UID do usuário autenticado no Firebase (`request.auth.uid`).
- `clienteNome` (`string`, obrigatório): Nome completo do cliente.
- `clienteEmail` (`string`, opcional): E-mail do cliente para notificações e envio de confirmações.
- `clienteTelefone` (`string`, opcional): Telefone com DDD para contato e lembretes via WhatsApp.

### 2.2. Profissional

Prepara o domínio para múltiplos profissionais, com valor padrão da profissional fundadora:

- `profissionalId` (`string`, obrigatório): Identificador do profissional (padrão: `'prof-tais-romagnoli'`).
- `profissionalNome` (`string`, obrigatório): Nome de exibição do profissional (padrão: `'Tais Romagnoli'`).

### 2.3. Serviço

Identifica o procedimento a ser realizado e sua respectiva duração:

- `servicoId` (`string`, obrigatório): Identificador do serviço no catálogo (`servicos/{servicoId}`).
- `servicoNome` (`string`, obrigatório): Nome comercial do serviço (ex: `"Massagem Relaxante"`).
- `duracaoMinutos` (`number`, inteiro positivo): Tempo de duração da sessão em minutos (ex: 60).

### 2.4. Horário

Define a janela de execução do atendimento e o intervalo operacional:

- `dataHoraInicio` (`string`, ISO 8601 UTC): Data e hora de início do atendimento (ex: `"2026-11-10T14:00:00.000Z"`).
- `dataHoraFim` (`string`, ISO 8601 UTC): Data e hora de término, calculada automaticamente a partir da soma de `dataHoraInicio` com `duracaoMinutos`.
- `intervaloAposMinutos` (`number`, inteiro não negativo): Intervalo obrigatório após o atendimento para higienização e preparação (padrão da clínica: `30` minutos).

### 2.5. Status

Representa o ciclo de vida completo do agendamento:

- `status` (`StatusAgendamento`, obrigatório):
  - `'pendente'`: Agendamento solicitado pelo cliente, aguardando confirmação ou pagamento de sinal.
  - `'confirmado'`: Sinal de 30% confirmado ou agendamento presencial isento criado pela administradora.
  - `'em_andamento'`: Sessão em atendimento no momento.
  - `'concluido'`: Procedimento finalizado com sucesso.
  - `'cancelado'`: Agendamento cancelado (classificado em `'no_prazo'` ou `'tardio'`).
  - `'falta'`: Cliente não compareceu ao atendimento agendado.

### 2.6. Valores e Pagamento

Gerencia os valores monetários em centavos (evitando imprecisão de ponto flutuante), o sinal obrigatório de 30% e a forma de pagamento:

- `valorTotalEmCentavos` (`number`, inteiro positivo): Valor bruto total do serviço (ex: `17000` = R$ 170,00).
- `valorSinalEmCentavos` (`number`, inteiro não negativo): Valor do sinal exigido para reserva (30% do total = `5100` = R$ 51,00).
- `saldoRestanteEmCentavos` (`number`, inteiro não negativo): Saldo a ser pago presencialmente após o atendimento (`11900` = R$ 119,00).
- `sinalIsento` (`boolean`, obrigatório): Indica se o agendamento foi dispensado de sinal (permitido exclusivamente para criação presencial no balcão pela administradora).
- `metodoPagamento` (`MetodoPagamento`, obrigatório): `'pix' | 'cartao' | 'boleto' | 'dinheiro' | 'presencial'`.

---

## 3. Metadados de Origem, Cancelamento e Auditoria

- `origem` (`'app_cliente' | 'presencial_admin'`): Canal de entrada do agendamento.
- `observacoes` (`string`, opcional): Observações e preferências do cliente ou orientações da clínica.
- `canceladoEm` (`string`, ISO 8601, opcional): Momento do cancelamento, caso ocorra.
- `motivoCancelamento` (`string`, opcional): Justificativa do cancelamento.
- `classificacaoCancelamento` (`'no_prazo' | 'tardio'`, opcional):
  - `'no_prazo'`: Solicitado com 3 horas ou mais de antecedência. Permite reutilização do sinal em novo agendamento. Sem estorno em dinheiro.
  - `'tardio'`: Solicitado com menos de 3 horas de antecedência. Sinal integralmente retido pela clínica.
- `sinalRetido` (`boolean`, opcional): Indica se o sinal foi retido como penalidade por cancelamento tardio ou falta.
- `sinalDisponivelReagendamento` (`boolean`, opcional): Indica se o cliente possui crédito de sinal para um futuro agendamento.
- `antecedenciaCancelamentoHoras` (`number`, opcional): Horas de antecedência registradas no ato do cancelamento.
- `createdAt` (`string`, ISO 8601 UTC): Carimbo de criação do documento.
- `updatedAt` (`string`, ISO 8601 UTC): Carimbo da última alteração.

---

## 4. Exemplo de Documento no Firestore

```json
{
  "id": "ag-20261110-001",
  "clienteId": "cliente-joao",
  "clienteNome": "João Silva",
  "clienteEmail": "joao@exemplo.com",
  "clienteTelefone": "(11) 99999-1111",
  "servicoId": "massagem-relaxante",
  "servicoNome": "Massagem Relaxante",
  "duracaoMinutos": 60,
  "dataHoraInicio": "2026-11-10T14:00:00.000Z",
  "dataHoraFim": "2026-11-10T15:00:00.000Z",
  "intervaloAposMinutos": 30,
  "profissionalId": "prof-tais-romagnoli",
  "profissionalNome": "Tais Romagnoli",
  "status": "confirmado",
  "valorTotalEmCentavos": 17000,
  "valorSinalEmCentavos": 5100,
  "saldoRestanteEmCentavos": 11900,
  "metodoPagamento": "pix",
  "sinalIsento": false,
  "origem": "app_cliente",
  "observacoes": "Preferência por aromaterapia com óleo de lavanda.",
  "createdAt": "2026-10-01T10:00:00.000Z",
  "updatedAt": "2026-10-01T10:00:00.000Z"
}
```

---

## 5. Índices Recomendados no Firestore

Para otimização de consultas da aplicação cliente e do painel administrativo:

1. `clienteId` (Ascending) + `dataHoraInicio` (Descending): Listagem dos agendamentos do cliente ordenados pelos mais recentes.
2. `profissionalId` (Ascending) + `dataHoraInicio` (Ascending): Verificação de conflitos de agenda e intervalos de manutenção.
3. `status` (Ascending) + `dataHoraInicio` (Ascending): Monitoramento dos atendimentos do dia para a administração.
