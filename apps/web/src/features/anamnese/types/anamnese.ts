export type IntensidadeDor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type NivelPressao = 'suave' | 'moderada' | 'firme';

export type FrequenciaAtividadeFisica = 'sedentario' | 'leve' | 'regular' | 'intensa';

export type ExperienciaMassoterapia = 'primeira_vez' | 'eventual' | 'frequente';

export type RegiaoCorpo =
  | 'pescoco_nuca'
  | 'ombros_trapezio'
  | 'costas_lombar'
  | 'costas_dorsal'
  | 'bracos_maos'
  | 'pernas_pes'
  | 'quadril_gluteos'
  | 'cabeca_face';

export interface CondicaoSaudeItem {
  resposta: boolean;
  detalhes?: string;
}

export interface FichaAnamneseData {
  // 1. Identificação e Motivo
  objetivoPrincipal: string;
  regioesFoco: RegiaoCorpo[];
  intensidadeDor: IntensidadeDor;
  descricaoQueixa?: string;

  // 2. Histórico de Saúde / Condições Clínicas
  gestanteOuLactante: CondicaoSaudeItem;
  problemasCirculatorios: CondicaoSaudeItem;
  doencasCardiacas: CondicaoSaudeItem;
  lesoesOuCirurgias: CondicaoSaudeItem;
  alergiasProdutos: CondicaoSaudeItem;
  problemasPele: CondicaoSaudeItem;
  tratamentoOncologico: CondicaoSaudeItem;
  usoMedicamentos: CondicaoSaudeItem;

  // 3. Preferências e Hábitos
  preferenciaPressao: NivelPressao;
  experienciaMassagem: ExperienciaMassoterapia;
  atividadeFisica: FrequenciaAtividadeFisica;
  observacoesAdicionais?: string;

  // 4. Consentimento
  consentimentoConfirmado: boolean;
}

export interface FichaAnamneseRecord extends FichaAnamneseData {
  id?: string;
  clienteId: string;
  submittedAt: string;
  updatedAt: string;
  pontosAtencao: string[];
}
