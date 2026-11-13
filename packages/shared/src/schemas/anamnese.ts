import { z } from 'zod';
import type {
  RegiaoCorpo,
  IntensidadeDor,
  NivelPressao,
  FrequenciaAtividadeFisica,
  ExperienciaMassoterapia,
  FichaAnamneseData,
  FichaAnamneseRecord,
  ResultadoAvaliacaoContraindicacao,
} from '../types/anamnese.js';

export const REGIOES_CORPO_OPCOES: ReadonlyArray<{
  id: RegiaoCorpo;
  label: string;
  descricao: string;
}> = [
  { id: 'pescoco_nuca', label: 'Pescoço e Nuca', descricao: 'Tensão cervical e rigidez' },
  { id: 'ombros_trapezio', label: 'Ombros e Trapézio', descricao: 'Sobrecarga e nós musculares' },
  { id: 'costas_dorsal', label: 'Costas (Dorsal/Meio)', descricao: 'Cansaço postural e escápulas' },
  { id: 'costas_lombar', label: 'Costas (Lombar)', descricao: 'Dor na base da coluna' },
  { id: 'bracos_maos', label: 'Braços e Mãos', descricao: 'LER/DORT e fadiga nos membros' },
  {
    id: 'quadril_gluteos',
    label: 'Quadril e Glúteos',
    descricao: 'Pressão ciática e rigidez pélvica',
  },
  { id: 'pernas_pes', label: 'Pernas e Pés', descricao: 'Inchaço, peso e circulação' },
  { id: 'cabeca_face', label: 'Cabeça e Face', descricao: 'Enxaqueca, bruxismo e estresse' },
];

export const OBJETIVOS_MASSAGEM = [
  'Alívio de dores e tensões musculares',
  'Relaxamento profundo e redução de estresse',
  'Drenagem linfática e redução de inchaço',
  'Recuperação pós-treino e esportiva',
  'Melhora da postura e flexibilidade',
  'Bem-estar geral e equilíbrio corporal',
] as const;

export const INITIAL_ANAMNESE_DATA: FichaAnamneseData = {
  objetivoPrincipal: 'Alívio de dores e tensões musculares',
  regioesFoco: ['ombros_trapezio', 'costas_lombar'],
  intensidadeDor: 3,
  descricaoQueixa: '',

  gestanteOuLactante: { resposta: false, detalhes: '' },
  problemasCirculatorios: { resposta: false, detalhes: '' },
  doencasCardiacas: { resposta: false, detalhes: '' },
  lesoesOuCirurgias: { resposta: false, detalhes: '' },
  alergiasProdutos: { resposta: false, detalhes: '' },
  problemasPele: { resposta: false, detalhes: '' },
  tratamentoOncologico: { resposta: false, detalhes: '' },
  usoMedicamentos: { resposta: false, detalhes: '' },

  preferenciaPressao: 'moderada',
  experienciaMassagem: 'eventual',
  atividadeFisica: 'regular',
  observacoesAdicionais: '',

  consentimentoConfirmado: false,
};

const regioesValidas: [RegiaoCorpo, ...RegiaoCorpo[]] = [
  'pescoco_nuca',
  'ombros_trapezio',
  'costas_lombar',
  'costas_dorsal',
  'bracos_maos',
  'pernas_pes',
  'quadril_gluteos',
  'cabeca_face',
];

export const condicaoItemSchema = z
  .object({
    resposta: z.boolean(),
    detalhes: z.string().optional(),
  })
  .refine(
    (val) => {
      if (val.resposta && (!val.detalhes || val.detalhes.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message:
        'Por favor, forneça detalhes sobre esta condição para adaptarmos o atendimento com segurança.',
      path: ['detalhes'],
    },
  );

export const fichaAnamneseSchema = z.object({
  objetivoPrincipal: z
    .string()
    .min(1, 'Selecione ou descreva o objetivo principal do seu atendimento.'),
  regioesFoco: z
    .array(z.enum(regioesValidas))
    .min(1, 'Selecione ao menos uma região do corpo que requer atenção ou relaxamento.'),
  intensidadeDor: z.number().int().min(0).max(10) as z.ZodType<IntensidadeDor>,
  descricaoQueixa: z
    .string()
    .max(1000, 'A descrição deve ter no máximo 1000 caracteres.')
    .optional(),

  gestanteOuLactante: condicaoItemSchema,
  problemasCirculatorios: condicaoItemSchema,
  doencasCardiacas: condicaoItemSchema,
  lesoesOuCirurgias: condicaoItemSchema,
  alergiasProdutos: condicaoItemSchema,
  problemasPele: condicaoItemSchema,
  tratamentoOncologico: condicaoItemSchema,
  usoMedicamentos: condicaoItemSchema,

  preferenciaPressao: z.enum(['suave', 'moderada', 'firme'] as [NivelPressao, ...NivelPressao[]], {
    message: 'Selecione a sua preferência de pressão para a massagem.',
  }),
  experienciaMassagem: z.enum(
    ['primeira_vez', 'eventual', 'frequente'] as [
      ExperienciaMassoterapia,
      ...ExperienciaMassoterapia[],
    ],
    {
      message: 'Informe sua experiência prévia com massoterapia.',
    },
  ),
  atividadeFisica: z.enum(
    ['sedentario', 'leve', 'regular', 'intensa'] as [
      FrequenciaAtividadeFisica,
      ...FrequenciaAtividadeFisica[],
    ],
    {
      message: 'Informe a frequência de atividades físicas.',
    },
  ),
  observacoesAdicionais: z
    .string()
    .max(1000, 'As observações devem ter no máximo 1000 caracteres.')
    .optional(),

  consentimentoConfirmado: z.boolean().refine((val) => val === true, {
    message: 'É necessário confirmar o termo de consentimento para prosseguir com a ficha.',
  }),
});

export const salvarFichaAnamneseInputSchema = z.object({
  clienteId: z.string().min(1, 'O identificador do cliente é obrigatório.').optional(),
  dados: fichaAnamneseSchema,
  exigeLiberacaoMedica: z.boolean().optional(),
  liberacaoMedicaAprovada: z.boolean().optional(),
  liberacaoMedicaObservacoes: z
    .string()
    .max(1000, 'As observações da liberação médica devem ter no máximo 1000 caracteres.')
    .optional(),
});

export type SalvarFichaAnamneseInput = z.infer<typeof salvarFichaAnamneseInputSchema>;

export const registrarLiberacaoMedicaInputSchema = z.object({
  clienteId: z.string().min(1, 'O identificador do cliente é obrigatório.'),
  aprovada: z.boolean(),
  observacoes: z
    .string()
    .max(1000, 'As observações da liberação médica devem ter no máximo 1000 caracteres.')
    .optional(),
  exigeLiberacaoMedica: z.boolean().optional(),
});

export type RegistrarLiberacaoMedicaInput = z.infer<typeof registrarLiberacaoMedicaInputSchema>;

export const CONDICOES_LIBERACAO_MEDICA = [
  'tratamentoOncologico',
  'problemasCirculatorios',
  'doencasCardiacas',
] as const;

export type CondicaoContraindicacaoKey = (typeof CONDICOES_LIBERACAO_MEDICA)[number];

export const MENSAGEM_BLOQUEIO_CONTRAINDICACAO =
  'Não é possível confirmar o agendamento porque a ficha de anamnese indica contraindicação que exige liberação médica prévia. Aprove a liberação médica na ficha após receber o aval médico.';

export function listarChavesContraindicacao(
  data?: Partial<FichaAnamneseData> | null,
): CondicaoContraindicacaoKey[] {
  if (!data) {
    return [];
  }

  return CONDICOES_LIBERACAO_MEDICA.filter((chave) => data[chave]?.resposta === true);
}

export function calcularContraindicacoesLiberacaoMedica(
  data?: Partial<FichaAnamneseData> | null,
): string[] {
  if (!data) {
    return [];
  }

  const contraindicacoes: string[] = [];

  if (data.tratamentoOncologico?.resposta === true) {
    contraindicacoes.push(
      `Tratamento Oncológico: ${data.tratamentoOncologico.detalhes?.trim() || 'Requer liberação médica'}`,
    );
  }

  if (data.doencasCardiacas?.resposta === true) {
    contraindicacoes.push(
      `Cardíaco: ${data.doencasCardiacas.detalhes?.trim() || 'Condição cardíaca ou uso de marca-passo requer liberação médica'}`,
    );
  }

  if (data.problemasCirculatorios?.resposta === true) {
    contraindicacoes.push(
      `Circulatório/Trombose: ${data.problemasCirculatorios.detalhes?.trim() || 'Condição circulatória ou vascular requer liberação médica'}`,
    );
  }

  return contraindicacoes;
}

export function avaliarBloqueioContraindicacao(
  ficha?: Partial<FichaAnamneseRecord> | null,
): ResultadoAvaliacaoContraindicacao {
  if (!ficha) {
    return {
      exigeLiberacaoMedica: false,
      contraindicacoes: [],
      liberacaoMedicaAprovada: false,
      bloqueado: false,
    };
  }

  const clinicas = calcularContraindicacoesLiberacaoMedica(ficha);
  const registradas = Array.isArray(ficha.contraindicacoes)
    ? ficha.contraindicacoes.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    : [];
  const contraindicacoes = Array.from(new Set([...clinicas, ...registradas]));
  const exigeLiberacaoMedica = ficha.exigeLiberacaoMedica === true || contraindicacoes.length > 0;
  const liberacaoMedicaAprovada = ficha.liberacaoMedicaAprovada === true;
  const bloqueado = exigeLiberacaoMedica && !liberacaoMedicaAprovada;

  return {
    exigeLiberacaoMedica,
    contraindicacoes,
    liberacaoMedicaAprovada,
    bloqueado,
    ...(bloqueado ? { motivoBloqueio: MENSAGEM_BLOQUEIO_CONTRAINDICACAO } : {}),
  };
}

export function calcularPontosAtencao(data: FichaAnamneseData): string[] {
  const pontos: string[] = [];

  if (data.gestanteOuLactante.resposta) {
    pontos.push(
      `Gestante/Lactante: ${data.gestanteOuLactante.detalhes || 'Sem detalhes informados'}`,
    );
  }

  if (data.problemasCirculatorios.resposta) {
    pontos.push(
      `Circulatório/Varizes: ${data.problemasCirculatorios.detalhes || 'Atenção a pressão/circulação'}`,
    );
  }

  if (data.doencasCardiacas.resposta) {
    pontos.push(`Cardíaco: ${data.doencasCardiacas.detalhes || 'Condição cardíaca informada'}`);
  }

  if (data.lesoesOuCirurgias.resposta) {
    pontos.push(
      `Lesões/Cirurgias: ${data.lesoesOuCirurgias.detalhes || 'Histórico de cirurgias ou hérnia'}`,
    );
  }

  if (data.alergiasProdutos.resposta) {
    pontos.push(`Alergias: ${data.alergiasProdutos.detalhes || 'Sensibilidade a cremes/óleos'}`);
  }

  if (data.problemasPele.resposta) {
    pontos.push(`Pele/Sensibilidade: ${data.problemasPele.detalhes || 'Lesões ou dermatites'}`);
  }

  if (data.tratamentoOncologico.resposta) {
    pontos.push(
      `Tratamento Oncológico: ${data.tratamentoOncologico.detalhes || 'Acompanhamento médico necessário'}`,
    );
  }

  if (data.usoMedicamentos.resposta) {
    pontos.push(`Medicamentos: ${data.usoMedicamentos.detalhes || 'Uso contínuo informado'}`);
  }

  if (data.intensidadeDor >= 7) {
    pontos.push(`Dor intensa referida (Nível ${data.intensidadeDor}/10)`);
  }

  return pontos;
}
