import { z } from 'zod';
import type { RegiaoCorpo } from '../types/anamnese';

const regioesValidas: RegiaoCorpo[] = [
  'pescoco_nuca',
  'ombros_trapezio',
  'costas_lombar',
  'costas_dorsal',
  'bracos_maos',
  'pernas_pes',
  'quadril_gluteos',
  'cabeca_face',
];

const condicaoItemSchema = z
  .object({
    resposta: z.boolean(),
    detalhes: z.string().optional(),
  })
  .refine(
    (val) => {
      // Se a resposta for sim (true), é recomendável preencher os detalhes quando aplicável
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
    .array(z.enum(regioesValidas as [RegiaoCorpo, ...RegiaoCorpo[]]))
    .min(1, 'Selecione ao menos uma região do corpo que requer atenção ou relaxamento.'),
  intensidadeDor: z.number().min(0).max(10),
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

  preferenciaPressao: z.enum(['suave', 'moderada', 'firme'], {
    message: 'Selecione a sua preferência de pressão para a massagem.',
  }),
  experienciaMassagem: z.enum(['primeira_vez', 'eventual', 'frequente'], {
    message: 'Informe sua experiência prévia com massoterapia.',
  }),
  atividadeFisica: z.enum(['sedentario', 'leve', 'regular', 'intensa'], {
    message: 'Informe a frequência de atividades físicas.',
  }),
  observacoesAdicionais: z
    .string()
    .max(1000, 'As observações devem ter no máximo 1000 caracteres.')
    .optional(),

  consentimentoConfirmado: z.boolean().refine((val) => val === true, {
    message: 'É necessário confirmar o termo de consentimento para prosseguir com a ficha.',
  }),
});

export type FichaAnamneseFormValues = z.infer<typeof fichaAnamneseSchema>;
