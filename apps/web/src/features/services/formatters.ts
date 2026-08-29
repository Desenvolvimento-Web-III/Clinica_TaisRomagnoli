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
