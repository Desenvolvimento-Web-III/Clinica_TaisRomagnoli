import type { z } from 'zod';
import {
  condicaoItemSchema,
  fichaAnamneseSchema,
  salvarFichaAnamneseInputSchema,
  registrarLiberacaoMedicaInputSchema,
  type SalvarFichaAnamneseInput,
  type RegistrarLiberacaoMedicaInput,
} from '@clinica/shared';

export {
  condicaoItemSchema,
  fichaAnamneseSchema,
  salvarFichaAnamneseInputSchema,
  registrarLiberacaoMedicaInputSchema,
};
export type { SalvarFichaAnamneseInput, RegistrarLiberacaoMedicaInput };
export type FichaAnamneseFormValues = z.infer<typeof fichaAnamneseSchema>;
