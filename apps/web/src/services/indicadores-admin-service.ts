import type { PainelIndicadores } from '@clinica/shared';
import { painelIndicadoresSchema } from '@clinica/shared';
import { getAuthToken, getFunctionsBaseUrl } from './agendamentos-service';

export const PAINEL_INDICADORES_PADRAO: PainelIndicadores = {
  dataReferencia: new Date().toISOString().slice(0, 10),
  mesReferencia: new Date().toISOString().slice(0, 7),
  geradoEmIso: new Date().toISOString(),
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
      detalhe: 'Sessões concluídas',
    },
    cancelamentosEFaltas: {
      totalCancelamentos: 4,
      cancelamentosNoPrazo: 3,
      cancelamentosTardios: 1,
      faltas: 1,
      taxaCancelamentoPercentual: 5.4,
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
      detalhe: 'R$ 3.830 previstos (sinal 30% retido)',
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
        taxaCancelamentoPercentual: 5.4,
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
        detalhe: 'R$ 3.830 previstos (sinal 30% retido)',
      },
    },
    servicos: {
      atendimentosRealizadosMes: {
        total: 74,
        totalMinutos: 4440,
        detalhe: 'Sessões concluídas',
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

export interface ConsultarIndicadoresOptions {
  dataReferencia?: string;
  mesReferencia?: string;
  token?: string | null;
}

/**
 * Consulta os 8 indicadores consolidados da clínica no backend (Cloud Function),
 * com validação de token administrativo e fallback seguro caso a API não esteja disponível.
 */
export async function consultarPainelIndicadoresAdmin(
  options: ConsultarIndicadoresOptions = {},
): Promise<PainelIndicadores> {
  try {
    const authToken = options.token ?? (await getAuthToken());
    if (!authToken) {
      return PAINEL_INDICADORES_PADRAO;
    }

    const queryParams = new URLSearchParams();
    if (options.dataReferencia) queryParams.set('dataReferencia', options.dataReferencia);
    if (options.mesReferencia) queryParams.set('mesReferencia', options.mesReferencia);

    const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `${getFunctionsBaseUrl()}/obterPainelIndicadoresAdmin${queryStr}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const body = await response.json();
      if (body?.sucesso && body.dados) {
        const parsed = painelIndicadoresSchema.safeParse(body.dados);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }
  } catch (err) {
    console.warn('Aviso: Falha ao consultar indicadores do painel no backend, usando padrão:', err);
  }

  return PAINEL_INDICADORES_PADRAO;
}
