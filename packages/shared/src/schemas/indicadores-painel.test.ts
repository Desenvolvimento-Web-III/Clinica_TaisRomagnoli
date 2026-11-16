import { describe, it, expect } from 'vitest';
import {
  painelIndicadoresSchema,
  indicadorAgendamentosDoDiaSchema,
  indicadorClientesRecorrentesSchema,
  indicadorValoresRecebidosEPrevistosSchema,
  indicadorOcupacaoAgendaSchema,
} from './indicadores-painel.js';

describe('indicadores-painel schema', () => {
  it('valida indicador de agendamentos do dia', () => {
    const dados = {
      total: 6,
      concluidos: 4,
      pendentes: 2,
      emAndamento: 0,
      cancelados: 0,
      detalhe: '4 concluídos, 2 pendentes',
    };
    const validado = indicadorAgendamentosDoDiaSchema.parse(dados);
    expect(validado.total).toBe(6);
    expect(validado.concluidos).toBe(4);
  });

  it('valida indicador de clientes recorrentes', () => {
    const dados = {
      total: 32,
      criterioMinimoAtendimentosMes: 2,
      percentualSobreTotal: 21.6,
      detalhe: '≥ 2 atendimentos no mesmo mês',
    };
    const validado = indicadorClientesRecorrentesSchema.parse(dados);
    expect(validado.total).toBe(32);
    expect(validado.criterioMinimoAtendimentosMes).toBe(2);
  });

  it('valida indicador de valores recebidos e previstos', () => {
    const dados = {
      valorTotalRecebidoCentavos: 894000,
      valorTotalPrevistoCentavos: 383000,
      valorTotalRecebidoReais: 8940,
      valorTotalPrevistoReais: 3830,
      valorSinaisRetidosCentavos: 3900,
      detalhe: 'R$ 8.940 recebidos, R$ 3.830 previstos',
    };
    const validado = indicadorValoresRecebidosEPrevistosSchema.parse(dados);
    expect(validado.valorTotalRecebidoReais).toBe(8940);
  });

  it('valida indicador de ocupação da agenda', () => {
    const dados = {
      taxaOcupacaoPercentual: 82,
      slotsOcupados: 74,
      slotsDisponiveis: 90,
      metaOcupacaoPercentual: 80,
      metaSuperada: true,
      detalhe: 'Meta mensal de 80% superada',
    };
    const validado = indicadorOcupacaoAgendaSchema.parse(dados);
    expect(validado.metaSuperada).toBe(true);
  });

  it('valida a estrutura completa do painel de indicadores com as 4 categorias', () => {
    const payloadCompleto = {
      dataReferencia: '2026-11-16',
      mesReferencia: '2026-11',
      geradoEmIso: '2026-11-16T12:00:00.000Z',
      indicadores: {
        agendamentosDoDia: {
          total: 6,
          concluidos: 4,
          pendentes: 2,
          emAndamento: 0,
          cancelados: 0,
          detalhe: '4 concluídos, 2 pendentes',
        },
        clientesCadastrados: {
          total: 148,
          novosNoMes: 12,
          detalhe: '+12 novos neste mês',
        },
        clientesRecorrentes: {
          total: 32,
          criterioMinimoAtendimentosMes: 2,
          percentualSobreTotal: 21.6,
          detalhe: '≥ 2 atendimentos no mesmo mês',
        },
        atendimentosRealizadosMes: {
          total: 74,
          totalMinutos: 4440,
          detalhe: '74 sessões concluídas',
        },
        cancelamentosEFaltas: {
          totalCancelamentos: 4,
          cancelamentosNoPrazo: 3,
          cancelamentosTardios: 1,
          faltas: 1,
          taxaCancelamentoPercentual: 5.1,
          detalhe: '3 com aviso ≥ 3h, 1 falta',
        },
        ocupacaoAgenda: {
          taxaOcupacaoPercentual: 82,
          slotsOcupados: 74,
          slotsDisponiveis: 90,
          metaOcupacaoPercentual: 80,
          metaSuperada: true,
          detalhe: 'Meta mensal de 80% superada',
        },
        valoresRecebidosEPrevistos: {
          valorTotalRecebidoCentavos: 894000,
          valorTotalPrevistoCentavos: 383000,
          valorTotalRecebidoReais: 8940,
          valorTotalPrevistoReais: 3830,
          valorSinaisRetidosCentavos: 3900,
          detalhe: 'R$ 8.940 recebidos, R$ 3.830 previstos',
        },
        servicoMaisAgendado: {
          servicoId: 'servico-massagem-relaxante',
          nome: 'Massagem Relaxante',
          totalAgendamentos: 38,
          detalhe: '38 atendimentos realizados',
          rankingTopServicos: [
            {
              servicoId: 'servico-massagem-relaxante',
              nome: 'Massagem Relaxante',
              totalAgendamentos: 38,
              totalAtendimentosConcluidos: 35,
              receitaCentavos: 532000,
            },
          ],
        },
      },
      categorias: {
        operacionais: {
          agendamentosDoDia: {
            total: 6,
            concluidos: 4,
            pendentes: 2,
            emAndamento: 0,
            cancelados: 0,
            detalhe: '4 concluídos, 2 pendentes',
          },
          cancelamentosEFaltas: {
            totalCancelamentos: 4,
            cancelamentosNoPrazo: 3,
            cancelamentosTardios: 1,
            faltas: 1,
            taxaCancelamentoPercentual: 5.1,
            detalhe: '3 com aviso ≥ 3h, 1 falta',
          },
          ocupacaoAgenda: {
            taxaOcupacaoPercentual: 82,
            slotsOcupados: 74,
            slotsDisponiveis: 90,
            metaOcupacaoPercentual: 80,
            metaSuperada: true,
            detalhe: 'Meta mensal de 80% superada',
          },
        },
        clientes: {
          clientesCadastrados: {
            total: 148,
            novosNoMes: 12,
            detalhe: '+12 novos neste mês',
          },
          clientesRecorrentes: {
            total: 32,
            criterioMinimoAtendimentosMes: 2,
            percentualSobreTotal: 21.6,
            detalhe: '≥ 2 atendimentos no mesmo mês',
          },
        },
        financeiras: {
          valoresRecebidosEPrevistos: {
            valorTotalRecebidoCentavos: 894000,
            valorTotalPrevistoCentavos: 383000,
            valorTotalRecebidoReais: 8940,
            valorTotalPrevistoReais: 3830,
            valorSinaisRetidosCentavos: 3900,
            detalhe: 'R$ 8.940 recebidos, R$ 3.830 previstos',
          },
        },
        servicos: {
          atendimentosRealizadosMes: {
            total: 74,
            totalMinutos: 4440,
            detalhe: '74 sessões concluídas',
          },
          servicoMaisAgendado: {
            servicoId: 'servico-massagem-relaxante',
            nome: 'Massagem Relaxante',
            totalAgendamentos: 38,
            detalhe: '38 atendimentos realizados',
            rankingTopServicos: [
              {
                servicoId: 'servico-massagem-relaxante',
                nome: 'Massagem Relaxante',
                totalAgendamentos: 38,
                totalAtendimentosConcluidos: 35,
                receitaCentavos: 532000,
              },
            ],
          },
        },
      },
    };

    const validado = painelIndicadoresSchema.parse(payloadCompleto);
    expect(validado.dataReferencia).toBe('2026-11-16');
    expect(validado.indicadores.agendamentosDoDia.total).toBe(6);
    expect(validado.categorias.operacionais.agendamentosDoDia.total).toBe(6);
    expect(validado.categorias.clientes.clientesRecorrentes.total).toBe(32);
    expect(validado.categorias.financeiras.valoresRecebidosEPrevistos.valorTotalRecebidoReais).toBe(
      8940,
    );
    expect(validado.categorias.servicos.servicoMaisAgendado.nome).toBe('Massagem Relaxante');
  });
});
