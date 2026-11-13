import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthToken, getFunctionsBaseUrl } from './agendamentos-service';

export interface ClientRecorrenciaData {
  recorrente: boolean;
  totalAtendimentosMes: number;
  totalAtendimentosConcluidos?: number;
  mesReferencia?: string;
  criterioMinimo?: number;
  ultimoAtendimento?: string;
}

/**
 * Consulta a recorrência mensal do cliente autenticado via Cloud Function,
 * com fallback direto para os campos do documento /clientes/{uid} no Firestore.
 */
export async function consultarRecorrenciaCliente(
  userUid?: string | null,
  token?: string | null,
): Promise<ClientRecorrenciaData | null> {
  if (!userUid || !userUid.trim()) {
    return null;
  }

  const cleanUid = userUid.trim();

  // 1. Tenta obter o cálculo atualizado da Cloud Function
  try {
    const authToken = token ?? (await getAuthToken());
    if (authToken) {
      const url = `${getFunctionsBaseUrl()}/calcularRecorrenciaCliente?uid=${encodeURIComponent(cleanUid)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const body = await response.json();
        if (body?.sucesso && body.dados) {
          const dados = body.dados;
          return {
            recorrente: Boolean(dados.recorrente),
            totalAtendimentosMes:
              typeof dados.totalAtendimentosMes === 'number' ? dados.totalAtendimentosMes : 0,
            totalAtendimentosConcluidos:
              typeof dados.totalAtendimentosConcluidos === 'number'
                ? dados.totalAtendimentosConcluidos
                : undefined,
            mesReferencia: dados.mesReferencia,
            criterioMinimo: typeof dados.criterioMinimo === 'number' ? dados.criterioMinimo : 2,
            ultimoAtendimento: dados.ultimoAtendimento,
          };
        }
      }
    }
  } catch {
    // Falhas de rede na Cloud Function seguem para fallback no Firestore
  }

  // 2. Fallback direto no Firestore
  if (db) {
    try {
      const clientDocRef = doc(db, 'clientes', cleanUid);
      const snapshot = await getDoc(clientDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const totalAtendimentosMes =
          typeof data.totalAtendimentosMes === 'number' ? data.totalAtendimentosMes : 0;
        const recorrente = Boolean(data.recorrente || totalAtendimentosMes >= 2);

        return {
          recorrente,
          totalAtendimentosMes,
          totalAtendimentosConcluidos:
            typeof data.totalAtendimentosConcluidos === 'number'
              ? data.totalAtendimentosConcluidos
              : undefined,
          mesReferencia: data.mesReferenciaRecorrencia,
          criterioMinimo: 2,
          ultimoAtendimento: data.ultimoAtendimento,
        };
      }
    } catch {
      // Ignora erro no fallback
    }
  }

  return null;
}
