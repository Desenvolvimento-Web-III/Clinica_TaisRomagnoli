export type ClientNotificationType = 'agendamento' | 'lembrete' | 'sistema' | 'comunicado';

export interface ClientNotification {
  /** Identificador único da notificação */
  id: string;
  /** Tipo/categoria da notificação */
  tipo: ClientNotificationType;
  /** Título do aviso */
  titulo: string;
  /** Conteúdo descritivo da notificação */
  mensagem: string;
  /** Indicador se a notificação já foi lida pelo cliente */
  lida: boolean;
  /** Data/hora de envio em formato ISO */
  createdAt: string;
  /** Rota ou link interno para ação direta */
  link?: string;
}
