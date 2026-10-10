import {
  criarPerfilClienteInputSchema,
  PREFERENCIAS_CONTATO_PADRAO,
  type UserProfile,
  type ContactPreferences,
} from '@clinica/shared';
import type { ClientesRepository } from './clientes-repository.js';
import type { NotificacoesRepository } from '../notificacoes/notificacoes-repository.js';
import type { UserContext } from '../agendamentos/agendamentos-service.js';

export class ClienteBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'ClienteBusinessError';
  }
}

/**
 * Registra o perfil básico do cliente após a criação da conta no Firebase Auth.
 * Garante validação de dados, integridade de papéis e geração opcional de boas-vindas.
 */
export async function registrarPerfilCliente(
  input: unknown,
  user: UserContext,
  repo: ClientesRepository,
  notifRepo?: NotificacoesRepository,
): Promise<UserProfile> {
  if (!user || !user.uid) {
    throw new ClienteBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const parsed = criarPerfilClienteInputSchema.parse(input);

  // Proteção de integridade: um cliente comum não pode criar perfil para outro UID
  if (parsed.uid && parsed.uid !== user.uid && !user.isAdmin) {
    throw new ClienteBusinessError(
      'Não é permitido registrar perfil com UID divergente do autenticado.',
      403,
    );
  }

  const uidFinal = user.isAdmin && parsed.uid ? parsed.uid : user.uid;

  // Verifica se já existe um perfil com esse UID (idempotência para retentativas de rede)
  const existentePorUid = await repo.buscarPorUid(uidFinal);
  if (existentePorUid) {
    return existentePorUid;
  }

  // Verifica se o e-mail já está associado a outro cliente cadastrado
  const existentePorEmail = await repo.buscarPorEmail(parsed.email);
  if (existentePorEmail && existentePorEmail.uid !== uidFinal) {
    throw new ClienteBusinessError(
      'Já existe um cliente cadastrado com este endereço de e-mail.',
      409,
    );
  }

  const preferenciasContato: ContactPreferences = parsed.preferenciasContato ?? {
    ...PREFERENCIAS_CONTATO_PADRAO,
  };

  const agoraIso = new Date().toISOString();

  // Papel e status são fixados pelo backend, impedindo que o cliente se autoatribua permissão de admin
  const novoPerfil: UserProfile = {
    uid: uidFinal,
    nome: parsed.nome.trim(),
    email: parsed.email.trim().toLowerCase(),
    telefone: parsed.telefone.trim(),
    role: 'cliente',
    status: 'ativo',
    createdAt: agoraIso,
    updatedAt: agoraIso,
    preferenciasContato,
  };

  const salvo = await repo.salvar(novoPerfil);

  // Gera notificação inicial de boas-vindas caso o repositório de notificações seja fornecido
  if (notifRepo) {
    try {
      await notifRepo.salvar({
        id: `notif-boas-vindas-${uidFinal}`,
        destinatarioId: uidFinal,
        destinatarioTipo: 'cliente',
        evento: 'confirmacao',
        tipo: 'sistema',
        titulo: 'Bem-vindo(a) à Clínica Tais Romagnoli!',
        mensagem: `Olá, ${novoPerfil.nome}! Seu cadastro foi realizado com sucesso. Explore nossos procedimentos e agende seu horário com comodidade.`,
        lida: false,
        createdAt: agoraIso,
        link: '/perfil',
      });
    } catch (err) {
      // Falhas no disparo da notificação não devem abortar a criação do perfil
      console.warn('Aviso: Não foi possível gerar a notificação inicial de boas-vindas:', err);
    }
  }

  return salvo;
}

/**
 * Consulta o perfil de um cliente respeitando regras de propriedade e perfil administrativo
 */
export async function obterPerfilCliente(
  uid: string,
  user: UserContext,
  repo: ClientesRepository,
): Promise<UserProfile> {
  if (!user || !user.uid) {
    throw new ClienteBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  if (user.uid !== uid && !user.isAdmin) {
    throw new ClienteBusinessError(
      'Acesso negado. Você só tem permissão para acessar o seu próprio perfil.',
      403,
    );
  }

  const perfil = await repo.buscarPorUid(uid);
  if (!perfil) {
    throw new ClienteBusinessError('Perfil do cliente não encontrado.', 404);
  }

  return perfil;
}
