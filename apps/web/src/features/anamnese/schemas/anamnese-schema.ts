import type { z } from 'zod';
import {
  condicaoItemSchema,
  fichaAnamneseSchema,
  salvarFichaAnamneseInputSchema,
  type SalvarFichaAnamneseInput,
} from '@clinica/shared';

export { condicaoItemSchema, fichaAnamneseSchema, salvarFichaAnamneseInputSchema };
export type { SalvarFichaAnamneseInput };
export type FichaAnamneseFormValues = z.infer<typeof fichaAnamneseSchema>;
