export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceInCents: number;
  sinalPercentual?: number;
  sinalInCents?: number;
  imageSrc: string;
  imageAlt: string;
  active: boolean;
  category?: string;
};
