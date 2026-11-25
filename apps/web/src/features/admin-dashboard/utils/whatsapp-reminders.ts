/**
 * Utilitários para Fila de Lembretes pelo WhatsApp (Envio Assistido)
 * Conforme regras do Brandbook e MVP_SCOPE:
 * - Mensagens acolhedoras com informações completas do atendimento.
 * - Envio assistido via link wa.me com mensagem pré-preenchida.
 */

export interface LembreteFilaItem {
  id: string; // ID do agendamento
  clienteId?: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  duracao: string;
  horario: string; // Ex: "09:00 - 10:00" ou "09:00"
  dataFormatada?: string; // Ex: "25/11/2026"
  dataHoraInicio?: string;
  statusAgendamento: string;
  statusLembrete: 'pendente' | 'enviado';
  enviadoEm?: string; // ISO timestamp
  mensagemPersonalizada?: string;
}

export const STORAGE_KEY_LEMBRETES_ENVIADOS = 'clinica_admin_lembretes_enviados_v1';

/**
 * Normaliza número de telefone para formato internacional aceito pelo WhatsApp (wa.me)
 * Adiciona o DDI 55 do Brasil caso não esteja presente.
 */
export function formatarTelefoneWhatsapp(telefone: string): string {
  if (!telefone) return '';
  const digits = telefone.replace(/\D/g, '');
  if (!digits) return '';

  // Se já possui DDI 55 e tem pelo menos 12 dígitos (ex: 5511999998888)
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }

  // Se possui DDD + número brasileiro (10 ou 11 dígitos, ex: 11999998888)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

/**
 * Gera mensagem acolhedora pré-formatada para lembrete de sessão
 */
export function gerarMensagemLembreteWhatsapp(params: {
  clienteNome: string;
  servicoNome: string;
  horario: string;
  dataFormatada?: string;
  profissionalNome?: string;
  endereco?: string;
}): string {
  const dataTexto = params.dataFormatada ? `no dia ${params.dataFormatada}` : 'hoje';
  const horarioTexto = params.horario ? `às ${params.horario.split(' - ')[0]}` : '';
  const profissional = params.profissionalNome ? ` com ${params.profissionalNome}` : '';

  return (
    `Olá, ${params.clienteNome}! ` +
    `Lembramos que seu atendimento de ${params.servicoNome}${profissional} está agendado ${dataTexto} ${horarioTexto} ` +
    `na Clínica Taís Romagnoli.\n\n` +
    `🌸 Recomendação: venha com roupas confortáveis para desfrutar do seu momento de relaxamento e autocuidado com tranquilidade.\n\n` +
    `⏱️ Política de reagendamento: caso necessite alterar seu horário, solicitamos aviso prévio com no mínimo 3 horas de antecedência.\n\n` +
    `Qualquer dúvida, estamos à disposição. Esperamos por você!`
  );
}

/**
 * Gera URL segura wa.me para abertura direta do WhatsApp
 */
export function gerarLinkWhatsapp(telefone: string, mensagem: string): string {
  const foneLimpo = formatarTelefoneWhatsapp(telefone);
  if (!foneLimpo) return '';
  return `https://wa.me/${foneLimpo}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Filtra itens da fila com base em busca e status
 */
export function filtrarLembretes(
  itens: LembreteFilaItem[],
  filtroStatus: 'todos' | 'pendentes' | 'enviados',
  termoBusca: string,
): LembreteFilaItem[] {
  const buscaNormalizada = termoBusca.trim().toLowerCase();

  return itens.filter((item) => {
    // Filtro por status
    if (filtroStatus === 'pendentes' && item.statusLembrete !== 'pendente') {
      return false;
    }
    if (filtroStatus === 'enviados' && item.statusLembrete !== 'enviado') {
      return false;
    }

    // Filtro por busca
    if (buscaNormalizada) {
      const matchNome = item.clienteNome.toLowerCase().includes(buscaNormalizada);
      const matchTelefone = item.clienteTelefone.toLowerCase().includes(buscaNormalizada);
      const matchServico = item.servicoNome.toLowerCase().includes(buscaNormalizada);
      if (!matchNome && !matchTelefone && !matchServico) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Carrega mapa de lembretes enviados salvos localmente
 */
export function carregarLembretesEnviadosStorage(): Record<string, string> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY_LEMBRETES_ENVIADOS);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Salva mapa de lembretes enviados no localStorage
 */
export function salvarLembretesEnviadosStorage(mapa: Record<string, string>): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_LEMBRETES_ENVIADOS, JSON.stringify(mapa));
  } catch {
    // Ignora se storage estiver indisponível
  }
}
