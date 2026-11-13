import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SessaoBusinessError,
  revogarSessoesUsuario,
  aplicarPoliticaSessaoUnica,
  consultarStatusSessao,
  type SessoesAuthAdapter,
  type SessoesFirestoreAdapter,
} from '../src/modules/auth/sessoes-service.js';
import type { UserContext } from '../src/middlewares/auth-middleware.js';

describe('SessoesService - Revogação de sessões e política de sessão única', () => {
  let mockAuth: SessoesAuthAdapter;
  let mockRevokeRefreshTokens: ReturnType<typeof vi.fn>;
  let mockGetUser: ReturnType<typeof vi.fn>;

  let mockFirestore: SessoesFirestoreAdapter;
  let mockDocSet: ReturnType<typeof vi.fn>;
  let mockCollectionAdd: ReturnType<typeof vi.fn>;

  const mockAdminUser: UserContext = {
    uid: 'admin-tais',
    nome: 'Tais Romagnoli',
    email: 'admin@clinicataisromagnoli.com.br',
    role: 'admin',
    isAdmin: true,
    isClient: false,
  };

  const mockClienteUser: UserContext = {
    uid: 'cliente-mariana',
    nome: 'Mariana Souza',
    email: 'mariana@exemplo.com',
    role: 'client',
    isAdmin: false,
    isClient: true,
  };

  beforeEach(() => {
    mockRevokeRefreshTokens = vi.fn().mockResolvedValue(undefined);
    mockGetUser = vi.fn().mockResolvedValue({
      uid: 'cliente-mariana',
      email: 'mariana@exemplo.com',
      tokensValidAfterTime: 'Thu, 07 Nov 2026 01:00:00 GMT',
      disabled: false,
    });

    mockAuth = {
      revokeRefreshTokens: mockRevokeRefreshTokens,
      getUser: mockGetUser,
    };

    mockDocSet = vi.fn().mockResolvedValue(undefined);
    mockCollectionAdd = vi.fn().mockResolvedValue({ id: 'auditoria-1' });

    mockFirestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: mockDocSet,
        })),
        add: mockCollectionAdd,
      })) as unknown as SessoesFirestoreAdapter['collection'],
    };
  });

  describe('revogarSessoesUsuario', () => {
    it('lança erro 401 se o chamador não estiver autenticado', async () => {
      await expect(revogarSessoesUsuario({}, null, mockAuth, mockFirestore)).rejects.toThrowError(
        SessaoBusinessError,
      );

      await expect(revogarSessoesUsuario({}, null, mockAuth, mockFirestore)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Acesso não autenticado. Forneça o token Bearer.',
      });
    });

    it('permite que o próprio usuário revogue suas sessões anteriores', async () => {
      const result = await revogarSessoesUsuario(
        { motivo: 'Invalidação manual de acessos antigos' },
        mockClienteUser,
        mockAuth,
        mockFirestore,
      );

      expect(result.uid).toBe(mockClienteUser.uid);
      expect(result.mensagem).toContain('Sessões anteriores e refresh tokens foram revogados');
      expect(result.motivo).toBe('Invalidação manual de acessos antigos');
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith(mockClienteUser.uid);
      expect(mockDocSet).toHaveBeenCalled();
      expect(mockCollectionAdd).toHaveBeenCalled();
    });

    it('permite que a administradora revogue sessões de outro usuário', async () => {
      mockGetUser.mockResolvedValueOnce({
        uid: 'cliente-outro',
        email: 'outro@exemplo.com',
      });

      const result = await revogarSessoesUsuario(
        { targetUid: 'cliente-outro', motivo: 'Suspeita de comprometimento' },
        mockAdminUser,
        mockAuth,
        mockFirestore,
      );

      expect(result.uid).toBe('cliente-outro');
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('cliente-outro');
      expect(mockCollectionAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUid: 'cliente-outro',
          revogadoPor: mockAdminUser.uid,
          motivo: 'Suspeita de comprometimento',
        }),
      );
    });

    it('bloqueia com HTTP 403 se cliente comum tentar revogar sessões de terceiros', async () => {
      await expect(
        revogarSessoesUsuario(
          { targetUid: 'cliente-outro' },
          mockClienteUser,
          mockAuth,
          mockFirestore,
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        message:
          'Acesso negado. Apenas a administradora possui permissão para revogar sessões de outros usuários.',
      });

      expect(mockRevokeRefreshTokens).not.toHaveBeenCalled();
    });

    it('lança HTTP 404 se o usuário alvo não for encontrado no Firebase Auth', async () => {
      mockGetUser.mockRejectedValueOnce({ code: 'auth/user-not-found' });

      await expect(
        revogarSessoesUsuario(
          { targetUid: 'user-inexistente' },
          mockAdminUser,
          mockAuth,
          mockFirestore,
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Usuário não encontrado no Firebase Authentication: user-inexistente',
      });

      expect(mockRevokeRefreshTokens).not.toHaveBeenCalled();
    });
  });

  describe('aplicarPoliticaSessaoUnica', () => {
    it('aplica a política de sessão única invalidando tokens anteriores e gerando sessionId', async () => {
      const result = await aplicarPoliticaSessaoUnica(
        mockClienteUser,
        mockAuth,
        mockFirestore,
        'Novo login em dispositivo móvel',
      );

      expect(result.uid).toBe(mockClienteUser.uid);
      expect(result.politicaSessaoUnica).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
      expect(result.mensagem).toContain('Política de sessão única aplicada');
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith(mockClienteUser.uid);
      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          activeSessionId: result.sessionId,
          activeSessionCreatedAt: expect.any(String),
          motivoUltimaRevogacao: 'Novo login em dispositivo móvel',
        }),
        { merge: true },
      );
    });

    it('aceita sessionId customizado fornecido pelo chamador', async () => {
      const result = await aplicarPoliticaSessaoUnica(
        mockClienteUser,
        mockAuth,
        mockFirestore,
        'Login customizado',
        'sessao-custom-12345',
      );

      expect(result.sessionId).toBe('sessao-custom-12345');
      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          activeSessionId: 'sessao-custom-12345',
        }),
        { merge: true },
      );
    });
  });

  describe('consultarStatusSessao', () => {
    it('permite que o próprio cliente consulte o status de sua sessão', async () => {
      const status = await consultarStatusSessao(mockClienteUser.uid, mockClienteUser, mockAuth);

      expect(status.uid).toBe(mockClienteUser.uid);
      expect(status.tokensValidAfterTime).toBe('Thu, 07 Nov 2026 01:00:00 GMT');
      expect(status.disabled).toBe(false);
      expect(status.activeSessionId).toBeUndefined();
    });

    it('recupera activeSessionId do Firestore quando fornecido', async () => {
      const mockFirestoreWithDoc = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ activeSessionId: 'sessao-ativa-recuperada' }),
            }),
          })),
        })),
      } as unknown as SessoesFirestoreAdapter;

      const status = await consultarStatusSessao(
        mockClienteUser.uid,
        mockClienteUser,
        mockAuth,
        mockFirestoreWithDoc,
      );

      expect(status.activeSessionId).toBe('sessao-ativa-recuperada');
    });

    it('permite que a administradora consulte o status da sessão de terceiros', async () => {
      mockGetUser.mockResolvedValueOnce({
        uid: 'user-consultado',
        email: 'consultado@exemplo.com',
        tokensValidAfterTime: 'Fri, 08 Nov 2026 12:00:00 GMT',
        disabled: true,
      });

      const status = await consultarStatusSessao('user-consultado', mockAdminUser, mockAuth);

      expect(status.uid).toBe('user-consultado');
      expect(status.disabled).toBe(true);
    });

    it('bloqueia com HTTP 403 se cliente tentar consultar sessão de outro usuário', async () => {
      await expect(
        consultarStatusSessao('outro-usuario', mockClienteUser, mockAuth),
      ).rejects.toMatchObject({
        statusCode: 403,
        message:
          'Acesso negado. Apenas a administradora possui permissão para consultar status de sessões de terceiros.',
      });
    });

    it('lança HTTP 404 se usuário não existir ao consultar sessão', async () => {
      mockGetUser.mockRejectedValueOnce({ code: 'auth/user-not-found' });

      await expect(
        consultarStatusSessao(mockClienteUser.uid, mockClienteUser, mockAuth),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: `Usuário não encontrado no Firebase Authentication: ${mockClienteUser.uid}`,
      });
    });
  });
});
