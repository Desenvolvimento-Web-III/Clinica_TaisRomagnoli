import { PERCENTUAL_SINAL_PADRAO } from '@clinica/shared';
import type { Service } from './types';

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatServicePrice(priceInCents: number) {
  return priceFormatter.format(priceInCents / 100);
}

export function formatServiceDuration(durationMinutes: number) {
  return `${durationMinutes} min`;
}

export function calculateServiceSinal(
  service: Pick<Service, 'priceInCents' | 'sinalPercentual' | 'sinalInCents'>,
) {
  const percentual = service.sinalPercentual ?? PERCENTUAL_SINAL_PADRAO;
  const sinalInCents =
    service.sinalInCents ?? Math.round((service.priceInCents * percentual) / 100);
  const saldoInCents = Math.max(0, service.priceInCents - sinalInCents);

  return {
    percentual,
    sinalInCents,
    saldoInCents,
  };
}
