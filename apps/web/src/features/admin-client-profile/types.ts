export type ClientStatus = 'ativo' | 'inativo';

export type AppointmentStatus =
  | 'agendado'
  | 'pendente'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
  | 'reagendado'
  | 'falta';

export type PaymentStatus = 'pago' | 'pendente' | 'credito' | 'perdido';

export type ClientAppointment = Readonly<{
  id: string;
  serviceName: string;
  startsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
}>;

export type ClientPayment = Readonly<{
  id: string;
  description: string;
  amountInCents: number;
  dueAt: string;
  paidAt?: string;
  status: PaymentStatus;
}>;

export type ClientAnamnesis = Readonly<{
  submittedAt: string;
  updatedAt: string;
  consentConfirmed: boolean;
  attentionPoints: readonly string[];
  notes: string;
  exigeLiberacaoMedica?: boolean;
  contraindicacoes?: readonly string[];
  liberacaoMedicaAprovada?: boolean;
  liberacaoMedicaObservacoes?: string;
  liberacaoMedicaAprovadaEm?: string;
  liberacaoMedicaAprovadaPor?: string;
}>;

export type AdministrativeClientProfile = Readonly<{
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  status: ClientStatus;
  registeredAt: string;
  appointments: readonly ClientAppointment[];
  payments: readonly ClientPayment[];
  anamnesis: ClientAnamnesis | null;
}>;
