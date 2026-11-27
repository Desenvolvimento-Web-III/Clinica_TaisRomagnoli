import type { Service } from './types';

export const serviceCatalog: readonly Service[] = [];

export function getActiveServices(services: readonly Service[]) {
  return services.filter((service) => service.active);
}
