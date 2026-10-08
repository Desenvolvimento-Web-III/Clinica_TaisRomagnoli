import type { FichaAnamneseData, RegiaoCorpo } from '../types/anamnese';

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
