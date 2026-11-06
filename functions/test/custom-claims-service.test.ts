import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  atribuirFuncaoAdministrativa,
  definirAdministradoraInicial,
  consultarClaimsUsuario,
  aplicarClaimsPerfil,
  definirClaimsCliente,
  CustomClaimsBusinessError,
} from '../src/modules/admin/custom-claims-service.js';
import type { UserContext } from '../src/modules/agendamentos/agendamentos-service.js';

describe('Custom Claims Service (Firebase Admin SDK)', () => {
  let mockAuth: {
    getUser: ReturnType<typeof vi.fn>;
    getUserByEmail: ReturnType<typeof vi.fn>;
    setCustomUserClaims: ReturnType<typeof vi.fn>;
  };
  let mockFirestore: {
    collection: ReturnType<typeof vi.fn>;
  };
  let mockUserDocSet: ReturnType<typeof vi.fn>;
  let mockClienteDocSet: ReturnType<typeof vi.fn>;

  const adminCaller: UserContext = {
    uid: 'admin-tais',
    email: 'admin@clinicataisromagnoli.com.br',
    nome: 'Tais Romagnoli',
    isAdmin: true,
  };

  const clientCaller: UserContext = {
    uid: 'cliente-mariana',
    email: 'mariana@exemplo.com',
    nome: 'Mariana Souza',
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserDocSet = vi.fn().mockResolvedValue(undefined);
    mockClienteDocSet = vi.fn().mockResolvedValue(undefined);

    mockAuth = {
      getUser: vi.fn().mockImplementation(async (uid: string) => ({
        uid,
        email: `${uid}@exemplo.com`,
        customClaims: {},
      })),
      getUserByEmail: vi.fn().mockImplementation(async (email: string) => ({
        uid: `uid-${email.split('@')[0]}`,
        email,
        customClaims: {},
      })),
      setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    };

    mockFirestore = {
      collection: vi.fn().mockImplementation((col: string) => ({
        doc: vi.fn().mockImplementation((docId: string) => {
          if (col === 'usuarios') {
            return {
              set: mockUserDocSet,
              get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ uid: docId }) }),
            };
          }
          if (col === 'clientes') {
            return {
              set: mockClienteDocSet,
              get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ uid: docId }) }),
            };
          }
          return {
            set: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue({ exists: false }),
          };
        }),
      })),
    };
  });

  describe('Prevenção de Autoatribuição e Segurança', () => {
    it('rejeita chamadas não autenticadas com erro 401', async () => {
      await expect(
        atribuirFuncaoAdministrativa({ targetUid: 'cliente-123' }, null, mockAuth, mockFirestore),
      ).rejects.toThrow(CustomClaimsBusinessError);

      await expect(
        atribuirFuncaoAdministrativa({ targetUid: 'cliente-123' }, null, mockAuth, mockFirestore),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: expect.stringContaining('não autenticado'),
      });
    });

    it('bloqueia estritamente tentativa de autoatribuição por cliente comum via UID (403)', async () => {
      await expect(
        atribuirFuncaoAdministrativa(
          { targetUid: clientCaller.uid, role: 'admin' },
          clientCaller,
          mockAuth,
          mockFirestore,
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Autoatribuição de função administrativa não é permitida.',
      });

      expect(mockAuth.setCustomUserClaims).not.toHaveBeenCalled();
    });

    it('bloqueia estritamente tentativa de autoatribuição por cliente comum via e-mail (403)', async () => {
      await expect(
        atribuirFuncaoAdministrativa(
          { email: clientCaller.email, role: 'admin' },
          clientCaller,
          mockAuth,
          mockFirestore,
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Autoatribuição de função administrativa não é permitida.',
      });

      expect(mockAuth.setCustomUserClaims).not.toHaveBeenCalled();
    });

    it('bloqueia tentativa de cliente comum promover outro usuário a administrador (403)', async () => {
      await expect(
        atribuirFuncaoAdministrativa(
          { targetUid: 'outro-usuario', role: 'admin' },
          clientCaller,
          mockAuth,
          mockFirestore,
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('Apenas a administradora possui permissão'),
      });

      expect(mockAuth.setCustomUserClaims).not.toHaveBeenCalled();
    });
  });

  describe('Atribuição por Administradora Autorizada', () => {
    it('permite que a administradora atribua custom claims de admin para um usuário por UID', async () => {
      const targetUid = 'cliente-promovido';
      const result = await atribuirFuncaoAdministrativa(
        { targetUid, role: 'admin' },
        adminCaller,
        mockAuth,
        mockFirestore,
      );

      expect(result.sucesso ?? true).toBeTruthy();
      expect(result.uid).toBe(targetUid);
      expect(result.admin).toBe(true);
      expect(result.role).toBe('admin');

      // Verifica chamada ao Firebase Admin SDK
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(targetUid, {
        role: 'admin',
        admin: true,
      });

      // Verifica sincronização no Firestore
      expect(mockUserDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: targetUid,
          role: 'admin',
          status: 'ativo',
        }),
        { merge: true },
      );
    });

    it('permite que a administradora atribua custom claims localizando por e-mail', async () => {
      const targetEmail = 'colaboradora@clinicataisromagnoli.com.br';
      const result = await atribuirFuncaoAdministrativa(
        { email: targetEmail, role: 'admin' },
        adminCaller,
        mockAuth,
        mockFirestore,
      );

      expect(result.email).toBe(targetEmail);
      expect(result.admin).toBe(true);
      expect(mockAuth.getUserByEmail).toHaveBeenCalledWith(targetEmail);
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('uid-colaboradora', {
        role: 'admin',
        admin: true,
      });
    });

    it('retorna 404 se o usuário alvo não for encontrado no Firebase Auth', async () => {
      mockAuth.getUser.mockRejectedValueOnce({ code: 'auth/user-not-found' });

      await expect(
        atribuirFuncaoAdministrativa(
          { targetUid: 'usuario-fantasma' },
          adminCaller,
          mockAuth,
          mockFirestore,
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('Usuário não encontrado'),
      });
    });

    it('permite revogar função administrativa definindo role cliente', async () => {
      const targetUid = 'ex-admin';
      const result = await atribuirFuncaoAdministrativa(
        { targetUid, role: 'cliente' },
        adminCaller,
        mockAuth,
        mockFirestore,
      );

      expect(result.admin).toBe(false);
      expect(result.role).toBe('cliente');
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(targetUid, {
        role: 'cliente',
        admin: false,
      });
    });
  });

  describe('definirAdministradoraInicial (Bootstrap)', () => {
    it('define a conta padrão da administradora pelo Firebase Admin SDK com Custom Claims', async () => {
      const result = await definirAdministradoraInicial(mockAuth, mockFirestore);

      expect(result.admin).toBe(true);
      expect(result.role).toBe('admin');
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(expect.any(String), {
        role: 'admin',
        admin: true,
      });
      expect(result.mensagem).toContain('Firebase Admin SDK');
    });
  });

  describe('consultarClaimsUsuario', () => {
    it('permite que o próprio cliente consulte suas claims', async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        uid: clientCaller.uid,
        customClaims: { role: 'cliente', admin: false },
      });

      const claims = await consultarClaimsUsuario(clientCaller.uid, clientCaller, mockAuth);
      expect(claims).toEqual({ role: 'cliente', admin: false });
    });

    it('permite que a administradora consulte claims de qualquer usuário', async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        uid: 'outro-user',
        customClaims: { role: 'admin', admin: true },
      });

      const claims = await consultarClaimsUsuario('outro-user', adminCaller, mockAuth);
      expect(claims).toEqual({ role: 'admin', admin: true });
    });

    it('bloqueia cliente comum de consultar claims de outros usuários (403)', async () => {
      await expect(
        consultarClaimsUsuario('outro-usuario', clientCaller, mockAuth),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('definirClaimsCliente', () => {
    it('aplica custom claims de cliente no Firebase Auth', async () => {
      const res = await definirClaimsCliente('cliente-teste-uid', mockAuth);
      expect(res.uid).toBe('cliente-teste-uid');
      expect(res.role).toBe('cliente');
      expect(res.admin).toBe(false);
      expect(res.client).toBe(true);
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('cliente-teste-uid', {
        role: 'cliente',
        admin: false,
        client: true,
      });
    });
  });

  describe('aplicarClaimsPerfil', () => {
    it('aplica claims de admin e sincroniza no Firestore', async () => {
      const res = await aplicarClaimsPerfil('admin-novo', 'admin', mockAuth, mockFirestore);
      expect(res.admin).toBe(true);
      expect(res.client).toBe(false);
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('admin-novo', {
        role: 'admin',
        admin: true,
        client: false,
      });
      expect(mockUserDocSet).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }), {
        merge: true,
      });
    });

    it('aplica claims de client e sincroniza no Firestore', async () => {
      const res = await aplicarClaimsPerfil('client-novo', 'client', mockAuth, mockFirestore);
      expect(res.admin).toBe(false);
      expect(res.client).toBe(true);
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('client-novo', {
        role: 'client',
        admin: false,
        client: true,
      });
    });
  });

  describe('Regras de atribuição para perfil client', () => {
    it('permite que usuário comum autoatribua seu próprio papel de client', async () => {
      const res = await atribuirFuncaoAdministrativa(
        { targetUid: clientCaller.uid, role: 'client' },
        clientCaller,
        mockAuth,
        mockFirestore,
      );

      expect(res.role).toBe('client');
      expect(res.admin).toBe(false);
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(clientCaller.uid, {
        role: 'client',
        admin: false,
        client: true,
      });
    });

    it('impede que usuário comum atribua papel de client para outro usuário (403)', async () => {
      await expect(
        atribuirFuncaoAdministrativa(
          { targetUid: 'outro-cliente', role: 'client' },
          clientCaller,
          mockAuth,
          mockFirestore,
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('Apenas a administradora possui permissão'),
      });
    });
  });
});
