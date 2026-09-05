import { getInitialClinicData, seedClinicData } from './seed-firestore.js';

export async function runLocalSeed(
  setFunction: (collection: string, id: string, data: Record<string, unknown>) => Promise<void>
) {
  console.log('Iniciando carga de dados padrão da Clínica Tais Romagnoli...');
  const result = await seedClinicData({
    set: setFunction,
  });
  console.log(`Carga concluída com sucesso! ${result.count} documentos aplicados nas coleções: ${result.collections.join(', ')}`);
  return result;
}

export { getInitialClinicData };
