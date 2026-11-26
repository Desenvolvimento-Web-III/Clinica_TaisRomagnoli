import type {
  AtualizarHorarioFixoInput,
  BloqueioAgenda,
  CriarBloqueioInput,
  CriarHorarioFixoInput,
  HorarioFixoCliente,
} from '@clinica/shared';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

function exigirFirebaseConfigurado() {
  if (!db || !auth?.currentUser) {
    throw new Error('Entre com uma conta administrativa para gerenciar os bloqueios da agenda.');
  }
  return { firestore: db, uid: auth.currentUser.uid };
}

function gerarId(prefixo: string): string {
  return `${prefixo}-${crypto.randomUUID()}`;
}

export async function listarBloqueiosAdmin(): Promise<BloqueioAgenda[]> {
  const { firestore } = exigirFirebaseConfigurado();
  const snapshot = await getDocs(collection(firestore, 'bloqueios_agenda'));
  return snapshot.docs
    .map((documento) => ({ ...(documento.data() as BloqueioAgenda), id: documento.id }))
    .sort((a, b) => {
      const dataA = a.tipo === 'unico' ? a.data : (a.dataInicio ?? '');
      const dataB = b.tipo === 'unico' ? b.data : (b.dataInicio ?? '');
      return dataA.localeCompare(dataB) || a.horaInicio.localeCompare(b.horaInicio);
    });
}

export async function criarBloqueioAdmin(input: CriarBloqueioInput): Promise<BloqueioAgenda> {
  const { firestore, uid } = exigirFirebaseConfigurado();
  const id = gerarId('bloq');
  const agora = new Date().toISOString();
  const bloqueio = {
    ...input,
    id,
    profissionalId: input.profissionalId ?? 'default',
    ativo: true,
    criadoPor: uid,
    criadoEm: agora,
  } as BloqueioAgenda;
  await setDoc(doc(firestore, 'bloqueios_agenda', id), bloqueio);
  return bloqueio;
}

export async function removerBloqueioAdmin(id: string): Promise<{ id: string; removido: boolean }> {
  const { firestore } = exigirFirebaseConfigurado();
  await deleteDoc(doc(firestore, 'bloqueios_agenda', id));
  return { id, removido: true };
}

export async function alterarStatusBloqueioAdmin(
  id: string,
  ativo: boolean,
): Promise<BloqueioAgenda> {
  const { firestore } = exigirFirebaseConfigurado();
  const ref = doc(firestore, 'bloqueios_agenda', id);
  await updateDoc(ref, { ativo, atualizadoEm: new Date().toISOString() });
  const atualizado = await getDoc(ref);
  if (!atualizado.exists()) throw new Error('Bloqueio não encontrado após a atualização.');
  return { ...(atualizado.data() as BloqueioAgenda), id: atualizado.id };
}

export async function listarHorariosFixosAdmin(): Promise<HorarioFixoCliente[]> {
  const { firestore } = exigirFirebaseConfigurado();
  const snapshot = await getDocs(collection(firestore, 'horarios_fixos'));
  return snapshot.docs
    .map((documento) => ({ ...(documento.data() as HorarioFixoCliente), id: documento.id }))
    .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'));
}

export async function criarHorarioFixoAdmin(
  input: CriarHorarioFixoInput,
): Promise<HorarioFixoCliente> {
  const { firestore, uid } = exigirFirebaseConfigurado();
  const id = gerarId('fixo');
  const agora = new Date().toISOString();
  const horarioFixo: HorarioFixoCliente = {
    ...input,
    id,
    profissionalId: input.profissionalId ?? 'default',
    ativo: input.ativo ?? true,
    criadoPor: uid,
    criadoEm: agora,
  };
  await setDoc(doc(firestore, 'horarios_fixos', id), horarioFixo);
  return horarioFixo;
}

export async function atualizarHorarioFixoAdmin(
  input: AtualizarHorarioFixoInput,
): Promise<HorarioFixoCliente> {
  const { firestore } = exigirFirebaseConfigurado();
  const { id, ...alteracoes } = input;
  const atualizadoEm = new Date().toISOString();
  const ref = doc(firestore, 'horarios_fixos', id);
  await updateDoc(ref, { ...alteracoes, atualizadoEm });
  const atualizado = await getDoc(ref);
  if (!atualizado.exists()) throw new Error('Horário fixo não encontrado após a atualização.');
  return { ...(atualizado.data() as HorarioFixoCliente), id: atualizado.id };
}

export async function removerHorarioFixoAdmin(
  id: string,
): Promise<{ id: string; removido: boolean }> {
  const { firestore } = exigirFirebaseConfigurado();
  await deleteDoc(doc(firestore, 'horarios_fixos', id));
  return { id, removido: true };
}
