import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { CONFIGURACAO_HORARIOS_PADRAO, type SalvarHorariosInput } from '@clinica/shared';
import {
  obterHorarios,
  salvarHorarios,
  CONFIGURACOES_COLLECTION,
} from '../src/modules/horarios/horarios-service.js';

describe('horarios-service', () => {
  let mockDocGet: ReturnType<typeof vi.fn>;
  let mockDocSet: ReturnType<typeof vi.fn>;
  let mockDocRef: { get: typeof mockDocGet; set: typeof mockDocSet };
  let mockCollection: ReturnType<typeof vi.fn>;
  let mockFirestore: Firestore;

  beforeEach(() => {
    mockDocGet = vi.fn();
    mockDocSet = vi.fn();
    mockDocRef = {
      get: mockDocGet,
      set: mockDocSet,
    };
    mockCollection = vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });
    mockFirestore = {
      collection: mockCollection,
    } as unknown as Firestore;
  });

  describe('obterHorarios', () => {
    it('retorna a configuração padrão se o documento não existir', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: false,
      });

      const resultado = await obterHorarios(mockFirestore);

      expect(mockCollection).toHaveBeenCalledWith(CONFIGURACOES_COLLECTION);
      expect(resultado).toEqual(CONFIGURACAO_HORARIOS_PADRAO);
    });

    it('retorna os dados do Firestore quando o documento existir e for válido', async () => {
      const dadosSalvos = {
        ...CONFIGURACAO_HORARIOS_PADRAO,
        intervaloPadraoMinutos: 45,
        atualizadoEm: '2026-09-05T15:00:00.000Z',
        atualizadoPor: 'admin-123',
      };

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => dadosSalvos,
      });

      const resultado = await obterHorarios(mockFirestore);

      expect(resultado).toEqual(dadosSalvos);
      expect(resultado.intervaloPadraoMinutos).toBe(45);
    });

    it('retorna configuração padrão caso os dados no banco sejam inválidos', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ dias: 'dado corrompido' }),
      });

      const resultado = await obterHorarios(mockFirestore);

      expect(resultado).toEqual(CONFIGURACAO_HORARIOS_PADRAO);
    });
  });

  describe('salvarHorarios', () => {
    it('valida e persiste nova configuração com metadados de auditoria', async () => {
      mockDocSet.mockResolvedValueOnce(undefined);

      const inputValido: SalvarHorariosInput = {
        intervaloPadraoMinutos: 30,
        dias: CONFIGURACAO_HORARIOS_PADRAO.dias,
        professionalId: 'tais-01',
      };

      const resultado = await salvarHorarios(mockFirestore, inputValido, 'admin-tais');

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          intervaloPadraoMinutos: 30,
          professionalId: 'tais-01',
          atualizadoPor: 'admin-tais',
          atualizadoEm: expect.any(String),
          dias: expect.any(Array),
        }),
        { merge: true },
      );

      expect(resultado.atualizadoPor).toBe('admin-tais');
      expect(resultado.atualizadoEm).toBeDefined();
    });

    it('rejeita payload inválido com erro do Zod', async () => {
      const inputInvalido = {
        intervaloPadraoMinutos: -5,
        dias: [],
      } as unknown as SalvarHorariosInput;

      await expect(salvarHorarios(mockFirestore, inputInvalido, 'admin-tais')).rejects.toThrow();
      expect(mockDocSet).not.toHaveBeenCalled();
    });
  });
});
